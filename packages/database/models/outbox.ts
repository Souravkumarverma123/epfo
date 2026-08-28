/**
 * OutboxEvent — PRD §11 Domain Model.
 */

import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./shared";

/**
 * OutboxEvent — "event id/type, aggregate, payload, status, attempts,
 * timestamps". Rows are written in the SAME transaction as the state change
 * they describe (PRD §17). Amendments (ADR-002): `lockedUntil` gives the
 * publisher a lease so two publisher instances can't double-send the same
 * event (`SELECT ... FOR UPDATE SKIP LOCKED` on unlocked-or-expired rows);
 * `schemaVersion` lets event payloads evolve later without breaking old
 * consumers, per PRD §15's event envelope.
 */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING"), // PENDING | PUBLISHED | FAILED
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** Publisher lease: a row locked until this time is assumed claimed. */
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("outbox_status_idx").on(t.status, t.createdAt)],
);
