import { z } from "zod";

const paiseWire = z.string().describe("Integer paise, as a string");

export const opsClaimSummarySchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  memberId: z.string(),
  type: z.string(),
  amountPaise: paiseWire,
  status: z.string(),
  reasonCode: z.string().nullable(),
  reasonDetail: z.string().nullable(),
  operationId: z.string(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const countBucketSchema = z.object({ status: z.string(), count: z.number() });

export const dependencyRowSchema = z.object({
  dependency: z.string(),
  mode: z.string(),
  updatedAt: z.string().nullable(),
});

export const reconciliationSchema = z.object({
  membersChecked: z.number(),
  discrepancies: z.array(
    z.object({
      memberId: z.string(),
      derivedBalancePaise: paiseWire,
      ledgerBalancePaise: paiseWire,
      differencePaise: paiseWire,
    }),
  ),
});

export const opsOverviewSchema = z.object({
  dependencies: z.array(dependencyRowSchema),
  claimsByStatus: z.array(countBucketSchema),
  outboxByStatus: z.array(countBucketSchema),
  stuckClaims: z.array(opsClaimSummarySchema),
  recentClaims: z.array(opsClaimSummarySchema),
  latencyMs: z.object({ p50: z.number().nullable(), p95: z.number().nullable() }),
  reconciliation: reconciliationSchema,
});

export const opsSearchInputSchema = z.object({ query: z.string() });

export const opsSearchOutputSchema = z.object({
  kind: z.enum(["claimNumber", "uan", "operationId", "unknown"]),
  claims: z.array(opsClaimSummarySchema),
});

export const auditRowSchema = z.object({
  id: z.string(),
  actorType: z.string(),
  actorId: z.string().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  beforeState: z.unknown().nullable(),
  afterState: z.unknown().nullable(),
  reason: z.string().nullable(),
  operationId: z.string().nullable(),
  createdAt: z.string(),
});

export const transitionRowSchema = z.object({
  id: z.string(),
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  actorType: z.string(),
  actorId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export const outboxRowSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  status: z.string(),
  attempts: z.number(),
  schemaVersion: z.number(),
  lastError: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const opsClaimDetailInputSchema = z.object({ claimId: z.string().uuid() });

export const opsClaimDetailOutputSchema = z.object({
  claim: opsClaimSummarySchema,
  transitions: z.array(transitionRowSchema),
  audit: z.array(auditRowSchema),
  relatedAudit: z.array(auditRowSchema),
  outbox: z.array(outboxRowSchema),
});

export const opsRetryInputSchema = z.object({ claimId: z.string().uuid() });

export const opsRetryOutputSchema = z.object({
  claimId: z.string(),
  statusBefore: z.string(),
  statusAfter: z.string(),
  changed: z.boolean(),
});

export type OpsOverviewWire = z.infer<typeof opsOverviewSchema>;
export type OpsSearchOutputWire = z.infer<typeof opsSearchOutputSchema>;
export type OpsClaimDetailWire = z.infer<typeof opsClaimDetailOutputSchema>;
export type OpsClaimSummaryWire = z.infer<typeof opsClaimSummarySchema>;
export type OpsRetryOutputWire = z.infer<typeof opsRetryOutputSchema>;
