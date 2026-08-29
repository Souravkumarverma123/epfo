import { and, desc, eq, isNull, ledgerEntries, memberBalances, or, sql } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type MemberBalanceRow = typeof memberBalances.$inferSelect;

export interface PostLedgerEntryInput {
  memberId: string;
  transactionId: string;
  /** CONTRIBUTION | INTEREST | WITHDRAWAL | REVERSAL */
  type: string;
  direction: "CREDIT" | "DEBIT";
  amountPaise: bigint;
  reference?: string;
  /** Set for entries tied to one employer relationship (a CONTRIBUTION);
   *  left unset for whole-account entries (e.g. INTEREST). */
  employmentId?: string;
  /** Set when this entry was posted for a specific contribution row —
   *  lets the passbook join back to month/pension-share directly. */
  contributionId?: string;
}

export class LedgerRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async getBalance(memberId: string): Promise<MemberBalanceRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(memberBalances)
      .where(eq(memberBalances.memberId, memberId))
      .limit(1);
    return row;
  }

  /** Every member gets exactly one balance row, created alongside the member. */
  async initializeBalance(memberId: string): Promise<void> {
    await this.executor
      .insert(memberBalances)
      .values({ memberId, currentBalancePaise: 0n, lastSequenceNumber: 0 });
  }

  async listByMember(memberId: string, limit = 100): Promise<LedgerEntryRow[]> {
    return this.executor
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.memberId, memberId))
      .orderBy(desc(ledgerEntries.sequenceNumber))
      .limit(limit);
  }

  async findLatestByType(memberId: string, type: string): Promise<LedgerEntryRow | undefined> {
    const rows = await this.listByMember(memberId, 500);
    return rows.find((r) => r.type === type);
  }

  /**
   * Entries for one employer relationship, oldest first (passbook order).
   * When `includeWholeAccountEntries` is true, entries with no employment
   * (e.g. INTEREST) are included too — the caller decides this only makes
   * sense for the member's currently active employment, not a past one.
   */
  async listByMemberAndEmployment(
    memberId: string,
    employmentId: string,
    includeWholeAccountEntries: boolean,
  ): Promise<LedgerEntryRow[]> {
    const employmentFilter = includeWholeAccountEntries
      ? or(eq(ledgerEntries.employmentId, employmentId), isNull(ledgerEntries.employmentId))
      : eq(ledgerEntries.employmentId, employmentId);

    return this.executor
      .select()
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.memberId, memberId), employmentFilter))
      .orderBy(ledgerEntries.sequenceNumber);
  }

  /**
   * Post one ledger entry and update the derived balance atomically
   * (PRD §12, ADR-002).
   *
   * MUST be called with a transaction executor (see withTransaction). The
   * `FOR UPDATE` lock below only serializes concurrent callers for the
   * lifetime of an enclosing transaction — called with the plain `db`
   * executor, the lock would be released before the following INSERT/UPDATE
   * even runs, and two concurrent postings could both read the same
   * starting balance and silently corrupt it.
   */
  async postEntry(entry: PostLedgerEntryInput): Promise<LedgerEntryRow> {
    const [balanceRow] = await this.executor
      .select()
      .from(memberBalances)
      .where(eq(memberBalances.memberId, entry.memberId))
      .for("update")
      .limit(1);

    if (!balanceRow) {
      throw new Error(
        `LedgerRepository.postEntry: no member_balances row for member ${entry.memberId}. Call initializeBalance first.`,
      );
    }

    const delta = entry.direction === "CREDIT" ? entry.amountPaise : -entry.amountPaise;
    const newBalance = balanceRow.currentBalancePaise + delta;
    const nextSequence = balanceRow.lastSequenceNumber + 1;

    const [ledgerRow] = await this.executor
      .insert(ledgerEntries)
      .values({
        memberId: entry.memberId,
        sequenceNumber: nextSequence,
        transactionId: entry.transactionId,
        type: entry.type,
        direction: entry.direction,
        amountPaise: entry.amountPaise,
        balanceAfterPaise: newBalance,
        reference: entry.reference,
        employmentId: entry.employmentId,
        contributionId: entry.contributionId,
      })
      .returning();

    if (!ledgerRow) throw new Error("LedgerRepository.postEntry: insert returned no row");

    await this.executor
      .update(memberBalances)
      .set({ currentBalancePaise: newBalance, lastSequenceNumber: nextSequence, updatedAt: new Date() })
      .where(eq(memberBalances.memberId, entry.memberId));

    return ledgerRow;
  }

  /**
   * Reconciliation (PRD §12 "build reconciliation capabilities between source
   * and derived balances", §34, §48).
   *
   * `member_balances.current_balance_paise` is a derived, mutable convenience
   * for fast reads. The authoritative figure is the ledger itself: credits
   * minus debits. This recomputes the second from scratch and reports any
   * member where the two disagree. A non-empty result is a bug, not a
   * business condition — which is exactly why it is worth showing an operator
   * rather than trusting it silently.
   */
  async reconcileBalances(): Promise<
    Array<{
      memberId: string;
      derivedBalancePaise: bigint;
      ledgerBalancePaise: bigint;
      entryCount: number;
    }>
  > {
    const rows = await this.executor
      .select({
        memberId: memberBalances.memberId,
        derivedBalancePaise: memberBalances.currentBalancePaise,
        ledgerBalancePaise: sql<string>`coalesce(sum(case when ${ledgerEntries.direction} = 'CREDIT' then ${ledgerEntries.amountPaise} else -${ledgerEntries.amountPaise} end), 0)`,
        entryCount: sql<string>`count(${ledgerEntries.id})`,
      })
      .from(memberBalances)
      .leftJoin(ledgerEntries, eq(ledgerEntries.memberId, memberBalances.memberId))
      .groupBy(memberBalances.memberId, memberBalances.currentBalancePaise);

    return rows.map((r) => ({
      memberId: r.memberId,
      derivedBalancePaise: r.derivedBalancePaise,
      ledgerBalancePaise: BigInt(r.ledgerBalancePaise),
      entryCount: Number(r.entryCount),
    }));
  }
}
