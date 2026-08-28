/**
 * PostgreSQL schema.
 *
 * ============================================================================
 * PART 1 — PRD §11 Domain Model (Member, Employment, Contribution, LedgerEntry,
 * Claim, Document, AuditEvent, IdempotencyRecord, OutboxEvent). Table and
 * column names below follow the PRD table as closely as SQL naming allows.
 *
 * PART 2 — Supporting infrastructure. Not named in §11, but required to make
 * those entities actually work (mock login, claim history, safe concurrent
 * balance updates). Each is commented with why it exists, so it never gets
 * mistaken for a PRD entity or vice versa.
 * ============================================================================
 *
 * Money is stored as bigint PAISE everywhere — no floats in the financial
 * path (PRD §12 amendment, see docs/adr/ADR-002-ledger-concurrency.md).
 */

import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ============================================================================
// PART 1 — PRD §11 Domain Model
// ============================================================================

/** Member — "id, UAN, identity data, contact information, status, timestamps" */
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Universal Account Number — synthetic, 12 digits. Also the login handle. */
    uan: text("uan").notNull(),
    fullName: text("full_name").notNull(),
    dateOfBirth: text("date_of_birth").notNull(), // ISO date
    maskedAadhaar: text("masked_aadhaar"),
    maskedPan: text("masked_pan"),
    mobile: text("mobile").notNull(),
    email: text("email"),
    bankAccountMasked: text("bank_account_masked"),
    bankIfsc: text("bank_ifsc"),
    /** "status" — KYC status drives the KYC step of the claim workflow. */
    kycStatus: text("kyc_status").notNull().default("PENDING"), // PENDING | VERIFIED | FAILED
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("members_uan_idx").on(t.uan)],
);

/** Employment — "member, employer, joining/exit dates, employment status" */
export const employments = pgTable(
  "employments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    employerName: text("employer_name").notNull(),
    establishmentCode: text("establishment_code").notNull(),
    joinedOn: text("joined_on").notNull(),
    exitedOn: text("exited_on"), // null while still employed
    /** "employment status", stated explicitly rather than inferred from exitedOn. */
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | EXITED
    createdAt: createdAt(),
  },
  (t) => [index("employments_member_idx").on(t.memberId)],
);

/** Contribution — "member/employment, employee/employer amounts, month, posting date, status, reference" */
export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => employments.id),
    /** Contribution month as YYYY-MM. */
    month: text("month").notNull(),
    employeeSharePaise: bigint("employee_share_paise", { mode: "bigint" }).notNull(),
    employerSharePaise: bigint("employer_share_paise", { mode: "bigint" }).notNull(),
    /** Pension (EPS) share — not named in §11's short field list but needed
     *  to compute Form 10C eligibility realistically rather than as a flat
     *  guess against the total balance. */
    pensionSharePaise: bigint("pension_share_paise", { mode: "bigint" }).notNull(),
    postedOn: timestamp("posted_on", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("POSTED"), // POSTED | LATE | MISSING
    reference: text("reference"),
    createdAt: createdAt(),
  },
  (t) => [
    index("contributions_member_idx").on(t.memberId),
    uniqueIndex("contributions_member_month_idx").on(t.memberId, t.employmentId, t.month),
  ],
);

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
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ledger_member_sequence_idx").on(t.memberId, t.sequenceNumber),
    index("ledger_member_created_idx").on(t.memberId, t.createdAt),
    index("ledger_txn_idx").on(t.transactionId),
  ],
);

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

// ============================================================================
// PART 2 — Supporting infrastructure (not named in PRD §11)
// ============================================================================

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

/**
 * Append-only claim status history. The citizen timeline and the admin trace
 * are both built from this — neither reads status transitions out of logs.
 * (Named `claim_transitions` rather than `claim_events` for the same reason
 * as `audit_log` above — this project has enough things named "event".)
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

/**
 * Mock login (PRD §6: mock identity, no real credentials). A real deployment
 * replaces this pair of tables with an OIDC provider (PRD §23) — the rest of
 * the app only ever sees "there is a session for this member", so the swap
 * touches nothing downstream.
 */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    /** Stored in the clear — these are synthetic demo codes, not secrets. */
    code: text("code").notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("otp_codes_member_idx").on(t.memberId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_member_idx").on(t.memberId)],
);

/**
 * Failure-injection switches for the live demo (PRD §40). Renamed from an
 * earlier `chaos_switches` draft to `dependency_state` because in a real
 * deployment this same shape (dependency name → UP/DOWN/SLOW) is what a
 * circuit breaker's state table looks like — so the demo table isn't
 * throwaway, it's the seed of a real one.
 */
export const dependencyState = pgTable("dependency_state", {
  /** e.g. 'kyc', 'payment', 'notification' */
  dependency: text("dependency").primaryKey(),
  mode: text("mode").notNull().default("UP"), // UP | DOWN | SLOW | TIMEOUT
  updatedAt: updatedAt(),
});
