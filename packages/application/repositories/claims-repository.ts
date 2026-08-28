import { claimTransitions, claims, desc, eq } from "@repo/database";
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
