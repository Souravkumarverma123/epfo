import { auditLog, and, desc, eq } from "@repo/database";
import { redactPII } from "@repo/domain";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type AuditLogRow = typeof auditLog.$inferSelect;

export type AuditActorType = "SYSTEM" | "CITIZEN" | "OFFICER";

export interface RecordAuditInput {
  actorType: AuditActorType;
  actorId?: string | null;
  /** Dotted verb, e.g. `claim.submitted`, `claim.transitioned`, `ledger.debited`. */
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  reason?: string | null;
  traceId?: string | null;
  /** Ties this row to every other row for the same citizen operation (PRD §26). */
  operationId?: string | null;
}

/**
 * Append-only audit trail (PRD §25).
 *
 * Deliberately has no update or delete method: "append-only" is enforced by
 * the repository's surface, not by a comment. The only way a row changes is
 * a migration, which is exactly the visibility we want for an audit table.
 *
 * `beforeState`/`afterState` go through @repo/domain's `redactPII` on the way
 * in (PRD §24) — the audit trail records *that* a field changed and by whom,
 * never a raw Aadhaar/PAN/bank number. Redaction happens here rather than at
 * each call site so no caller can forget it.
 */
export class AuditRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async record(input: RecordAuditInput): Promise<AuditLogRow> {
    const [row] = await this.executor
      .insert(auditLog)
      .values({
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        beforeState: input.beforeState ? redactPII(input.beforeState) : null,
        afterState: input.afterState ? redactPII(input.afterState) : null,
        reason: input.reason ?? null,
        traceId: input.traceId ?? null,
        operationId: input.operationId ?? null,
      })
      .returning();
    if (!row) throw new Error("AuditRepository.record: insert returned no row");
    return row;
  }

  async listByResource(
    resourceType: string,
    resourceId: string,
    limit = 100,
  ): Promise<AuditLogRow[]> {
    return this.executor
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.resourceType, resourceType), eq(auditLog.resourceId, resourceId)))
      .orderBy(auditLog.createdAt)
      .limit(limit);
  }

  /** The PRD §47 step-12 lookup: one operation ID, every row it touched. */
  async listByOperation(operationId: string, limit = 200): Promise<AuditLogRow[]> {
    return this.executor
      .select()
      .from(auditLog)
      .where(eq(auditLog.operationId, operationId))
      .orderBy(auditLog.createdAt)
      .limit(limit);
  }

  async listRecent(limit = 50): Promise<AuditLogRow[]> {
    return this.executor.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
  }
}
