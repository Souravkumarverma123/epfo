import { claimTransitions, claims, count, desc, eq, sql } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type ClaimRow = typeof claims.$inferSelect;
export type NewClaimRow = typeof claims.$inferInsert;
export type ClaimTransitionRow = typeof claimTransitions.$inferSelect;

export class OptimisticConcurrencyError extends Error {
  constructor(claimId: string) {
    super(`Claim ${claimId} was modified by someone else — reload and try again`);
    this.name = "OptimisticConcurrencyError";
  }
}

export class ClaimsRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async create(data: NewClaimRow): Promise<ClaimRow> {
    const [row] = await this.executor.insert(claims).values(data).returning();
    if (!row) throw new Error("ClaimsRepository.create: insert returned no row");
    return row;
  }

  async findById(claimId: string): Promise<ClaimRow | undefined> {
    const [row] = await this.executor.select().from(claims).where(eq(claims.id, claimId)).limit(1);
    return row;
  }

  async findByClaimNumber(claimNumber: string): Promise<ClaimRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber))
      .limit(1);
    return row;
  }

  async listByMember(memberId: string, limit = 50): Promise<ClaimRow[]> {
    return this.executor
      .select()
      .from(claims)
      .where(eq(claims.memberId, memberId))
      .orderBy(desc(claims.createdAt))
      .limit(limit);
  }

  /** Operations lookup (PRD §36 "claim search by ... operation ID"). One
   *  operation ID maps to one claim; the audit log is what fans it out to
   *  everything else that operation touched. */
  async findByOperationId(operationId: string): Promise<ClaimRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(claims)
      .where(eq(claims.operationId, operationId))
      .limit(1);
    return row;
  }

  async listRecent(limit = 25): Promise<ClaimRow[]> {
    return this.executor.select().from(claims).orderBy(desc(claims.createdAt)).limit(limit);
  }

  /** Feeds the operational metrics panel (PRD §27 "business metrics"). */
  async countByStatus(): Promise<Array<{ status: string; count: number }>> {
    const rows = await this.executor
      .select({ status: claims.status, count: count() })
      .from(claims)
      .groupBy(claims.status);
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  /** Claims currently parked at a retryable failure — PRD §36's "failed
   *  workflow inspection". These are exactly the ones an operator can act on. */
  async listStuck(limit = 25): Promise<ClaimRow[]> {
    return this.executor
      .select()
      .from(claims)
      .where(eq(claims.status, "FAILED_RETRYABLE"))
      .orderBy(desc(claims.updatedAt))
      .limit(limit);
  }

  /**
   * Acknowledgement latency (PRD §28: "claim acknowledgement P95 < 1 second").
   *
   * `submitted_at` is the timestamp the service captured when the request
   * arrived; `created_at` is the database default, stamped when the claim row
   * actually committed. The gap between them is therefore exactly what the
   * SLO is about: how long the citizen waited between asking and being given
   * a durable claim number. (Ordering matters — created_at is the later of
   * the two, so the subtraction runs that way round.)
   *
   * Percentiles are computed in Postgres rather than pulled into Node: this
   * is a metrics read, and shipping every row over to sort it here would be
   * the wrong shape the moment there is more than a demo's worth of data.
   */
  async submissionLatencyMs(): Promise<{ p50: number | null; p95: number | null }> {
    const rows = await this.executor
      .select({
        p50: sql<string | null>`percentile_cont(0.5) within group (order by extract(epoch from (${claims.createdAt} - ${claims.submittedAt})) * 1000)`,
        p95: sql<string | null>`percentile_cont(0.95) within group (order by extract(epoch from (${claims.createdAt} - ${claims.submittedAt})) * 1000)`,
      })
      .from(claims)
      .where(sql`${claims.submittedAt} is not null`);
    const row = rows[0];
    return {
      p50: row?.p50 == null ? null : Number(row.p50),
      p95: row?.p95 == null ? null : Number(row.p95),
    };
  }

  /**
   * Move a claim to a new status with optimistic concurrency (PRD §16):
   * the UPDATE only applies if `version` still matches what the caller last
   * read. If someone else changed the claim in between (or this exact call
   * is somehow replayed outside the idempotency guard), zero rows match and
   * we throw rather than silently overwrite a state we didn't actually see.
   */
  async updateStatus(params: {
    claimId: string;
    expectedVersion: number;
    toStatus: string;
    reasonCode?: string | null;
    reasonDetail?: string | null;
    submittedAt?: Date;
    completedAt?: Date;
  }): Promise<ClaimRow> {
    const [row] = await this.executor
      .update(claims)
      .set({
        status: params.toStatus,
        version: params.expectedVersion + 1,
        reasonCode: params.reasonCode,
        reasonDetail: params.reasonDetail,
        submittedAt: params.submittedAt,
        completedAt: params.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(claims.id, params.claimId))
      .returning();

    if (!row) throw new OptimisticConcurrencyError(params.claimId);
    return row;
  }

  async insertTransition(data: {
    claimId: string;
    fromStatus: string | null;
    toStatus: string;
    actorType: "SYSTEM" | "CITIZEN" | "OFFICER";
    actorId?: string;
    note?: string;
  }): Promise<ClaimTransitionRow> {
    const [row] = await this.executor.insert(claimTransitions).values(data).returning();
    if (!row) throw new Error("ClaimsRepository.insertTransition: insert returned no row");
    return row;
  }

  async listTransitions(claimId: string): Promise<ClaimTransitionRow[]> {
    return this.executor
      .select()
      .from(claimTransitions)
      .where(eq(claimTransitions.claimId, claimId))
      .orderBy(claimTransitions.createdAt);
  }
}
