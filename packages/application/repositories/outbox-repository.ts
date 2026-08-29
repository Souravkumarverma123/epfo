import { and, count, desc, eq, outboxEvents } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type OutboxEventRow = typeof outboxEvents.$inferSelect;

export class OutboxRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  /**
   * PRD §17: written in the SAME transaction as the state change it
   * describes. Called with a `Tx` from inside `withTransaction`, alongside
   * whatever else that transaction does (e.g. ClaimsRepository.create) —
   * both commit together or neither does, so there is no window where a
   * claim exists but the event announcing it was lost.
   *
   * There is no consumer/publisher yet (Inngest — PRD Phase 4, documented
   * as not built). Rows land here and wait; nothing is lost by that, which
   * is the whole point of the pattern.
   */
  async insert(event: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: unknown;
  }): Promise<OutboxEventRow> {
    const [row] = await this.executor
      .insert(outboxEvents)
      .values({
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as object,
      })
      .returning();
    if (!row) throw new Error("OutboxRepository.insert: insert returned no row");
    return row;
  }

  /** Every event this aggregate produced — the "was the trigger lost?"
   *  question from PRD §17, answered by looking rather than guessing. */
  async listByAggregate(
    aggregateType: string,
    aggregateId: string,
    limit = 50,
  ): Promise<OutboxEventRow[]> {
    return this.executor
      .select()
      .from(outboxEvents)
      .where(
        and(eq(outboxEvents.aggregateType, aggregateType), eq(outboxEvents.aggregateId, aggregateId)),
      )
      .orderBy(outboxEvents.createdAt)
      .limit(limit);
  }

  async countByStatus(): Promise<Array<{ status: string; count: number }>> {
    const rows = await this.executor
      .select({ status: outboxEvents.status, count: count() })
      .from(outboxEvents)
      .groupBy(outboxEvents.status);
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  async listRecent(limit = 25): Promise<OutboxEventRow[]> {
    return this.executor
      .select()
      .from(outboxEvents)
      .orderBy(desc(outboxEvents.createdAt))
      .limit(limit);
  }
}
