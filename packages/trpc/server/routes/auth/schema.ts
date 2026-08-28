import { z } from "zod";

/**
 * The output-schema-as-PII-allowlist rule (PRD §24): only fields listed here
 * can ever leave the server for this shape. maskedAadhaar/maskedPan/mobile are
 * already masked/formatted at write time — nothing raw is even in reach.
 */
export const memberProfileSchema = z.object({
  id: z.string(),
  uan: z.string(),
  fullName: z.string(),
  kycStatus: z.string(),
  maskedAadhaar: z.string().nullable(),
  maskedPan: z.string().nullable(),
  mobile: z.string(),
  email: z.string().nullable(),
});
export type MemberProfile = z.infer<typeof memberProfileSchema>;
