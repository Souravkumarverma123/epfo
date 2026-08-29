import { TRPCError } from "@trpc/server";
import { paiseToWire } from "@repo/domain";
import { ClaimNotFoundError, type ClaimRow } from "@repo/application";
import type { AuditLogRow, ClaimTransitionRow, OutboxEventRow } from "@repo/application";
import { publicProcedure, router } from "../../trpc";
import { z, zodUndefinedModel } from "../../schema";
import {
  opsClaimDetailInputSchema,
  opsClaimDetailOutputSchema,
  opsOverviewSchema,
  opsRetryInputSchema,
  opsRetryOutputSchema,
  opsSearchInputSchema,
  opsSearchOutputSchema,
  type OpsClaimDetailWire,
  type OpsClaimSummaryWire,
  type OpsOverviewWire,
  type OpsRetryOutputWire,
  type OpsSearchOutputWire,
} from "./schema";

function toClaimSummary(c: ClaimRow): OpsClaimSummaryWire {
  return {
    id: c.id,
    claimNumber: c.claimNumber,
    memberId: c.memberId,
    type: c.type,
    amountPaise: paiseToWire(c.amountPaise),
    status: c.status,
    reasonCode: c.reasonCode,
    reasonDetail: c.reasonDetail,
    operationId: c.operationId,
    version: c.version,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    submittedAt: c.submittedAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
  };
}

function toAuditRow(a: AuditLogRow) {
  return {
    id: a.id,
    actorType: a.actorType,
    actorId: a.actorId,
    action: a.action,
    resourceType: a.resourceType,
    resourceId: a.resourceId,
    beforeState: a.beforeState ?? null,
    afterState: a.afterState ?? null,
    reason: a.reason,
    operationId: a.operationId,
    createdAt: a.createdAt.toISOString(),
  };
}

function toTransitionRow(t: ClaimTransitionRow) {
  return {
    id: t.id,
    fromStatus: t.fromStatus,
    toStatus: t.toStatus,
    actorType: t.actorType,
    actorId: t.actorId,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
  };
}

function toOutboxRow(o: OutboxEventRow) {
  return {
    id: o.id,
    eventType: o.eventType,
    aggregateType: o.aggregateType,
    aggregateId: o.aggregateId,
    status: o.status,
    attempts: o.attempts,
    schemaVersion: o.schemaVersion,
    lastError: o.lastError,
    publishedAt: o.publishedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  };
}

/**
 * Operations / admin console (PRD §36, §37).
 *
 * Deliberately on `publicProcedure`, like the demo router and for the same
 * reason: there is no officer/OIDC persona in this prototype, and inventing a
 * third fake login would make the console *look* authorized without being so.
 * PRD §23's RBAC is stated as not built rather than mimed — the console says
 * this on screen. The one mutation (`retry`) still writes an OFFICER audit row
 * naming who asked, so the action is accountable even while the identity
 * behind it is a prototype stand-in.
 */
export const opsRouter = router({
  overview: publicProcedure
    .meta({ openapi: { method: "GET", path: "/ops/overview" } })
    .input(zodUndefinedModel)
    .output(opsOverviewSchema)
    .query(async ({ ctx }): Promise<OpsOverviewWire> => {
      const o = await ctx.opsService.overview();
      return {
        dependencies: o.dependencies.map((d) => ({
          dependency: d.dependency,
          mode: d.mode,
          updatedAt: d.updatedAt?.toISOString() ?? null,
        })),
        claimsByStatus: o.claimsByStatus,
        outboxByStatus: o.outboxByStatus,
        stuckClaims: o.stuckClaims.map(toClaimSummary),
        recentClaims: o.recentClaims.map(toClaimSummary),
        latencyMs: o.latencyMs,
        reconciliation: {
          membersChecked: o.reconciliation.membersChecked,
          discrepancies: o.reconciliation.discrepancies.map((d) => ({
            memberId: d.memberId,
            derivedBalancePaise: paiseToWire(d.derivedBalancePaise),
            ledgerBalancePaise: paiseToWire(d.ledgerBalancePaise),
            differencePaise: paiseToWire(d.differencePaise),
          })),
        },
      };
    }),

  search: publicProcedure
    .meta({ openapi: { method: "GET", path: "/ops/search" } })
    .input(opsSearchInputSchema)
    .output(opsSearchOutputSchema)
    .query(async ({ ctx, input }): Promise<OpsSearchOutputWire> => {
      const result = await ctx.opsService.search(input.query);
      return { kind: result.kind, claims: result.claims.map(toClaimSummary) };
    }),

  claimDetail: publicProcedure
    .meta({ openapi: { method: "GET", path: "/ops/claim" } })
    .input(opsClaimDetailInputSchema)
    .output(opsClaimDetailOutputSchema)
    .query(async ({ ctx, input }): Promise<OpsClaimDetailWire> => {
      try {
        const d = await ctx.opsService.claimDetail(input.claimId);
        return {
          claim: toClaimSummary(d.claim),
          transitions: d.transitions.map(toTransitionRow),
          audit: d.audit.map(toAuditRow),
          relatedAudit: d.relatedAudit.map(toAuditRow),
          outbox: d.outbox.map(toOutboxRow),
        };
      } catch (err) {
        if (err instanceof ClaimNotFoundError) {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        throw err;
      }
    }),

  retry: publicProcedure
    .meta({ openapi: { method: "POST", path: "/ops/retry" } })
    .input(opsRetryInputSchema)
    .output(opsRetryOutputSchema)
    .mutation(async ({ ctx, input }): Promise<OpsRetryOutputWire> => {
      try {
        const before = await ctx.opsService.claimDetail(input.claimId);
        const after = await ctx.opsService.retryClaim(input.claimId, "ops-console");
        return {
          claimId: after.id,
          statusBefore: before.claim.status,
          statusAfter: after.status,
          changed: before.claim.status !== after.status,
        };
      } catch (err) {
        if (err instanceof ClaimNotFoundError) {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        throw err;
      }
    }),
});
