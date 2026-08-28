import { and, eq, idempotencyRecords } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type IdempotencyRecordRow = typeof idempotencyRecords.$inferSelect;

export type BeginResult =
  | { outcome: "started" }
  | { outcome: "in_progress" }
  | { outcome: "completed"; response: unknown }
  | { outcome: "conflict" };

export class IdempotencyRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  /**
   * PRD §16: a repeated request with the same idempotency key returns the
   * same logical result instead of creating a duplicate. The unique
   * (actor, operation, key) primary key is what actually enforces this —
   * "citizen clicks Submit five times" loses the race at the database
   * level, not in application logic that could itself have a bug.
   *
   * - `started`: no record existed; caller should proceed and call
   *   `complete()` when done.
   * - `in_progress`: another request with this exact key is mid-flight
   *   right now — the caller should tell the citizen to wait, not retry.
   * - `completed`: this exact request already finished — replay the stored
   *   response verbatim rather than doing the work again.
   * - `conflict`: this key was reused with a different request body —
   *   reject; reusing a key for a different operation is a client bug.
   */
  async begin(params: {
    actorId: string;
    operation: string;
    key: string;
    requestHash: string;
    ttlMs: number;
  }): Promise<BeginResult> {
    const existing = await this.executor
      .select()
      .from(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.actorId, params.actorId),
          eq(idempotencyRecords.operation, params.operation),
          eq(idempotencyRecords.key, params.key),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const record = existing[0]!;
      if (record.requestHash !== params.requestHash) return { outcome: "conflict" };
      if (record.status === "COMPLETED") return { outcome: "completed", response: record.response };
      return { outcome: "in_progress" };
    }

    try {
      await this.executor.insert(idempotencyRecords).values({
        actorId: params.actorId,
        operation: params.operation,
        key: params.key,
        requestHash: params.requestHash,
        status: "IN_PROGRESS",
        expiresAt: new Date(Date.now() + params.ttlMs),
      });
      return { outcome: "started" };
    } catch {
      // Lost the race against a concurrent identical request between our
      // SELECT and this INSERT — the unique key rejected us. Treat it the
      // same as finding it already there.
      return { outcome: "in_progress" };
    }
  }

  async complete(params: {
    actorId: string;
    operation: string;
    key: string;
    response: unknown;
  }): Promise<void> {
    await this.executor
      .update(idempotencyRecords)
      .set({ status: "COMPLETED", response: params.response })
      .where(
        and(
          eq(idempotencyRecords.actorId, params.actorId),
          eq(idempotencyRecords.operation, params.operation),
          eq(idempotencyRecords.key, params.key),
        ),
      );
  }
}
