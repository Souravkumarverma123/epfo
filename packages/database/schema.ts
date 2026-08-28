/**
 * Schema barrel. Every table lives in its own file under ./models, grouped by
 * domain concept (one file per PRD §11 entity or entity cluster — e.g. auth.ts
 * for the mock-login tables). This file only re-exports them, so drizzle-kit
 * (which reads this path from drizzle.config.ts) sees the full table set.
 *
 * PRD §11 entities: member (Member, Employment), contribution (Contribution),
 * ledger (LedgerEntry + MemberBalance), claims (Claim, Document,
 * ClaimTransition), audit (AuditEvent), idempotency (IdempotencyRecord),
 * outbox (OutboxEvent).
 *
 * Supporting, not in §11: auth (mock login), demo (failure-injection
 * switches), nominee (real KYC concept, not in the original entity list),
 * employer (the employer/establishment persona, also not in §11).
 */

export * from "./models/member";
export * from "./models/contribution";
export * from "./models/ledger";
export * from "./models/claims";
export * from "./models/audit";
export * from "./models/idempotency";
export * from "./models/outbox";
export * from "./models/auth";
export * from "./models/demo";
export * from "./models/nominee";
export * from "./models/employer";
