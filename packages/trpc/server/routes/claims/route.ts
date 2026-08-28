import { TRPCError } from "@trpc/server";
import { paiseToWire, parsePaiseWire, type ClaimType } from "@repo/domain";
import {
  ClaimRejectedError,
  IdempotencyConflictError,
  RequestInProgressError,
} from "@repo/application";
import { protectedProcedure, router } from "../../trpc";
import { z, zodUndefinedModel } from "../../schema";
import {
  checkEligibilityInputSchema,
  claimStatusInputSchema,
  claimStatusOutputSchema,
  claimSummarySchema,
  eligibilityOutputSchema,
  submitClaimInputSchema,
  submitClaimOutputSchema,
  type ClaimStatusOutputWire,
  type EligibilityOutputWire,
  type SubmitClaimOutputWire,
} from "./schema";

export const claimsRouter = router({
  checkEligibility: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/claims/eligibility" } })
    .input(checkEligibilityInputSchema)
    .output(eligibilityOutputSchema)
    .query(async ({ ctx, input }): Promise<EligibilityOutputWire> => {
      const result = await ctx.claimsService.checkEligibility(ctx.member.id, input.type, input.purpose);
      return {
        eligible: result.eligible,
        maxAmountPaise: paiseToWire(result.maxAmountPaise),
        reasons: result.reasons,
      };
    }),

  submit: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/claims/submit" } })
    .input(submitClaimInputSchema)
    .output(submitClaimOutputSchema)
    .mutation(async ({ ctx, input }): Promise<SubmitClaimOutputWire> => {
      try {
        const { claim, replayed } = await ctx.claimsService.submitClaim({
          memberId: ctx.member.id,
          type: input.type,
          purpose: input.purpose,
          amountPaise: parsePaiseWire(input.amountPaise),
          idempotencyKey: input.idempotencyKey,
        });
        return { claimNumber: claim.claimNumber, status: claim.status, replayed };
      } catch (err) {
        if (err instanceof ClaimRejectedError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        if (err instanceof IdempotencyConflictError) {
          throw new TRPCError({ code: "CONFLICT", message: err.message });
        }
        if (err instanceof RequestInProgressError) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: err.message });
        }
        throw err;
      }
    }),

  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/claims" } })
    .input(zodUndefinedModel)
    .output(z.array(claimSummarySchema))
    .query(async ({ ctx }) => {
      const claims = await ctx.claimsService.listClaims(ctx.member.id);
      return claims.map((c) => ({
        claimNumber: c.claimNumber,
        type: c.type as ClaimType,
        amountPaise: paiseToWire(c.amountPaise),
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      }));
    }),

  getStatus: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/claims/{claimNumber}/status" } })
    .input(claimStatusInputSchema)
    .output(claimStatusOutputSchema)
    .query(async ({ ctx, input }): Promise<ClaimStatusOutputWire> => {
      const result = await ctx.claimsService.getStatus(ctx.member.id, input.claimNumber);
      return {
        claimNumber: result.claim.claimNumber,
        type: result.claim.type as ClaimStatusOutputWire["type"],
        amountPaise: paiseToWire(result.claim.amountPaise),
        status: result.claim.status,
        reasonCode: result.claim.reasonCode,
        reasonDetail: result.claim.reasonDetail,
        submittedAt: result.claim.submittedAt?.toISOString() ?? null,
        completedAt: result.claim.completedAt?.toISOString() ?? null,
        timeline: result.timeline,
      };
    }),
});
