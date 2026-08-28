import { z } from "zod";
import { ADVANCE_PURPOSES, CLAIM_TYPES } from "@repo/domain";

const paiseWire = z.string().describe("Integer paise, as a string");

export const claimTypeSchema = z.enum(CLAIM_TYPES);
export const advancePurposeSchema = z.enum(ADVANCE_PURPOSES);

export const checkEligibilityInputSchema = z.object({
  type: claimTypeSchema,
  purpose: advancePurposeSchema.optional(),
});

export const eligibilityOutputSchema = z.object({
  eligible: z.boolean(),
  maxAmountPaise: paiseWire,
  reasons: z.array(z.string()),
});

export const submitClaimInputSchema = z.object({
  type: claimTypeSchema,
  purpose: advancePurposeSchema.optional(),
  amountPaise: paiseWire,
  /** Client-generated, stable across retries of the same logical submit
   *  (PRD §16) — typically one UUID created when the review step is shown,
   *  reused if the request is retried after a network error. */
  idempotencyKey: z.string().min(1),
});

export const submitClaimOutputSchema = z.object({
  claimNumber: z.string(),
  status: z.string(),
  replayed: z.boolean(),
});

export const claimSummarySchema = z.object({
  claimNumber: z.string(),
  type: claimTypeSchema,
  amountPaise: paiseWire,
  status: z.string(),
  createdAt: z.string(),
});

export const claimStatusInputSchema = z.object({ claimNumber: z.string() });

export const claimStatusOutputSchema = z.object({
  claimNumber: z.string(),
  type: claimTypeSchema,
  amountPaise: paiseWire,
  status: z.string(),
  reasonCode: z.string().nullable(),
  reasonDetail: z.string().nullable(),
  submittedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  timeline: z.array(z.object({ status: z.string(), state: z.enum(["done", "active", "pending"]) })),
});

export type EligibilityOutputWire = z.infer<typeof eligibilityOutputSchema>;
export type SubmitClaimOutputWire = z.infer<typeof submitClaimOutputSchema>;
export type ClaimStatusOutputWire = z.infer<typeof claimStatusOutputSchema>;
