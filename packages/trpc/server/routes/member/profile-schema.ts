import { z } from "zod";

const bilingualText = z.object({ en: z.string(), hi: z.string() });

export const nomineeSchema = z.object({
  fullName: z.string(),
  relationship: bilingualText,
  sharePercentage: z.number(),
  setOn: z.string(),
});

export const memberProfileDetailSchema = z.object({
  fullName: z.string(),
  dateOfBirth: z.string(),
  guardianName: z.string().nullable(),
  maskedAadhaar: z.string().nullable(),
  maskedPan: z.string().nullable(),
  kycStatus: z.string(),
  mobile: z.string(),
  email: z.string().nullable(),
  bankAccountMasked: z.string().nullable(),
  bankIfsc: z.string().nullable(),
  nominees: z.array(nomineeSchema),
});
export type MemberProfileDetailWire = z.infer<typeof memberProfileDetailSchema>;
