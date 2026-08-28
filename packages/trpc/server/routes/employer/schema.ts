import { z } from "zod";

/** Output-schema-as-PII-allowlist rule (PRD §24), applied to the employer
 *  side too: only fields listed here ever leave the server for this shape. */
export const establishmentSchema = z.object({
  id: z.string(),
  establishmentCode: z.string(),
  name: z.string(),
  city: z.string(),
});
export type EstablishmentProfile = z.infer<typeof establishmentSchema>;

export const employeeRowSchema = z.object({
  employmentId: z.string(),
  memberId: z.string(),
  fullName: z.string(),
  uan: z.string(),
  kycStatus: z.string(),
  joinedOn: z.string(),
  exitedOn: z.string().nullable(),
  employmentStatus: z.string(),
});

export const employerDashboardSchema = z.object({
  establishment: establishmentSchema,
  employees: z.array(employeeRowSchema),
  activeCount: z.number(),
  pendingKycCount: z.number(),
});
