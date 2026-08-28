/**
 * Claim, Document — PRD §11 Domain Model.
 * ClaimTransition — supporting table, not named in §11 (see comment below).
 */

import { bigint, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./shared";
import { members } from "./member";

/** Claim — "claim number, member, type, amount, status, timestamps, rejection reason, version" */
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-facing reference, e.g. EPFO-92831. This is what we promise never to lose. */
    claimNumber: text("claim_number").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    type: text("type").notNull(), // FORM_19 | FORM_10C | FORM_31
    /** Form 31 only. Not in §11's field list; required by the form itself. */
    purpose: text("purpose"),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    status: text("status").notNull().default("DRAFT"), // ClaimStatus, see @repo/domain
    /** "version" — optimistic concurrency (PRD §16). Bumped on every state change. */
    version: integer("version").notNull().default(0),
    /** "rejection reason" */
    reasonCode: text("reason_code"),
    reasonDetail: text("reason_detail"),
    /** Correlates every log, span, event and audit row for this claim.
     *  Not in §11's field list; required by PRD §26 tracing. */
    operationId: uuid("operation_id").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("claims_number_idx").on(t.claimNumber),
    index("claims_member_idx").on(t.memberId, t.createdAt),
    index("claims_status_idx").on(t.status),
    index("claims_operation_idx").on(t.operationId),
  ],
);

/** Document — "claim, type, storage key, MIME type, size, checksum, scan status" */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id),
    type: text("type").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum").notNull(),
    scanStatus: text("scan_status").notNull().default("PENDING"), // PENDING | CLEAN | INFECTED
    createdAt: createdAt(),
  },
  (t) => [index("documents_claim_idx").on(t.claimId)],
);

/**
 * Append-only claim status history. The citizen timeline and the admin trace
 * are both built from this — neither reads status transitions out of logs.
 * (Named `claim_transitions` rather than `claim_events` — this project has
 * enough things named "event": domain events, outbox events, audit log.)
 */
export const claimTransitions = pgTable(
  "claim_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    /** Free-text note for operators; never shown raw to citizens. */
    note: text("note"),
    actorType: text("actor_type").notNull().default("SYSTEM"), // SYSTEM | CITIZEN | OFFICER
    actorId: text("actor_id"),
    createdAt: createdAt(),
  },
  (t) => [index("claim_transitions_claim_idx").on(t.claimId, t.createdAt)],
);
