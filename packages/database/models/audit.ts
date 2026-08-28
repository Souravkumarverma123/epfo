/**
 * AuditEvent — PRD §11 Domain Model.
 */

import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./shared";

/**
 * AuditEvent — "actor, action, resource, before/after state, trace and
 * operation identifiers". Table named `audit_log`, not `audit_events`: this
 * project already has too many things that could be called "event"
 * (domain events, outbox events, claim transitions) — `audit_log` reads
 * unambiguously on its own.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type").notNull(), // SYSTEM | CITIZEN | OFFICER
    actorId: text("actor_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    /** Redacted via @repo/domain's redactPII before write — PII never lands here (PRD §24). */
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    /** "reason where relevant" — PRD §25. */
    reason: text("reason"),
    traceId: text("trace_id"),
    operationId: uuid("operation_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_resource_idx").on(t.resourceType, t.resourceId),
    index("audit_log_operation_idx").on(t.operationId),
  ],
);
