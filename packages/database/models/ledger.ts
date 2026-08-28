/**
 * LedgerEntry — PRD §11 Domain Model.
 * MemberBalance — supporting table, not named in §11 (see comment below).
 */

import { bigint, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./shared";
import { employments, members } from "./member";
import { contributions } from "./contribution";

/**
 * LedgerEntry — "member, transaction, type, direction, amount, balance-after,
 * reference; immutable". Rows are only ever INSERTed, never UPDATEd or
 * DELETEd. `sequenceNumber` is an addition beyond §11's field list — see
 * ADR-002: without a per-member sequence, two concurrent withdrawals can both
 * read the same starting balance and both insert a `balance_after`, silently
 * corrupting the ledger. The unique index on (member, sequence) makes that
 * impossible at the database level.
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    /** Monotonic per member. Assigned by the application layer while it
     *  holds the row lock on member_balances — see packages/application. */
    sequenceNumber: integer("sequence_number").notNull(),
    /** Groups every ledger entry produced by one logical financial operation. */
    transactionId: uuid("transaction_id").notNull(),
    type: text("type").notNull(), // CONTRIBUTION | INTEREST | WITHDRAWAL | REVERSAL
    direction: text("direction").notNull(), // CREDIT | DEBIT
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    balanceAfterPaise: bigint("balance_after_paise", { mode: "bigint" }).notNull(),
    reference: text("reference"),
    /** Which employer relationship this entry belongs to, when it has one
     *  (a CONTRIBUTION does; an INTEREST credit on the whole account does
     *  not). Lets the passbook filter by employer with a real join instead
     *  of parsing `reference` text. Nullable — not every entry has one. */
    employmentId: uuid("employment_id").references(() => employments.id),
    /** The specific contribution this entry was posted for, when there is
     *  one. Lets the passbook pull month/pension-share (not itself part of
     *  the ledger — PRD §12 amendment) via a direct join instead of
     *  matching contributions to ledger entries positionally. */
    contributionId: uuid("contribution_id").references(() => contributions.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ledger_member_sequence_idx").on(t.memberId, t.sequenceNumber),
    index("ledger_member_created_idx").on(t.memberId, t.createdAt),
    index("ledger_txn_idx").on(t.transactionId),
    index("ledger_employment_idx").on(t.employmentId),
  ],
);

/**
 * Derived/current balance per member (PRD §12: "maintain a derived/current
 * balance for fast reads if required"). This is the row the application
 * layer locks with `SELECT ... FOR UPDATE` before posting a ledger entry —
 * see ADR-002. Reconciliation compares this against SUM(ledger_entries).
 */
export const memberBalances = pgTable("member_balances", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id),
  // No default: the application layer inserts this row explicitly (at
  // 0n) when a member is created — drizzle-kit's snapshot diff cannot
  // serialize a bigint literal default, and an explicit insert is the
  // more honest choice anyway (no silent "balance starts at zero" magic).
  currentBalancePaise: bigint("current_balance_paise", { mode: "bigint" }).notNull(),
  lastSequenceNumber: integer("last_sequence_number").notNull().default(0),
  updatedAt: updatedAt(),
});
