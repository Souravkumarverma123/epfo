/**
 * IdempotencyRecord — PRD §11 Domain Model.
 */

import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createdAt } from "./shared";

/**
 * IdempotencyRecord — "key, operation, actor, request hash, status, response,
 * expiry". Amendment (ADR-002): the primary key is (actor, operation, key),
 * not just (key, operation) — as originally scoped, two different citizens
 * reusing the same client-generated key would collide with each other.
 */
export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    actorId: text("actor_id").notNull(),
    operation: text("operation").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull().default("IN_PROGRESS"), // IN_PROGRESS | COMPLETED
    /** The stored response, replayed verbatim on a duplicate request. */
    response: jsonb("response"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.actorId, t.operation, t.key] })],
);
