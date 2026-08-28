import { z } from "zod";

/** Money crosses the wire as a decimal-string of paise (see @repo/domain's
 *  paiseToWire) — bigint cannot survive JSON.stringify, and REST consumers
 *  are external systems where a string is the interoperable choice. */
const paiseWire = z.string().describe("Integer paise, as a string");

/** Bilingual, matching the rest of the app's convention: the server sends
 *  both locales, the client picks — consistent with claim status copy. */
const bilingualText = z.object({ en: z.string(), hi: z.string() });

export const memberTaskSchema = z.object({
  code: z.string(),
  title: bilingualText,
  description: bilingualText,
  severity: z.enum(["action", "optional"]),
});

export const employmentSummarySchema = z.object({
  employerName: z.string(),
  joinedOn: z.string(),
  exitedOn: z.string().nullable(),
  status: z.string(),
  contributedPaise: paiseWire,
});

export const dashboardSummarySchema = z.object({
  fullName: z.string(),
  uan: z.string(),
  totalBalancePaise: paiseWire,
  lastContribution: z
    .object({ amountPaise: paiseWire, month: z.string(), onTime: z.boolean() })
    .nullable(),
  latestInterestCredit: z
    .object({ amountPaise: paiseWire, reference: z.string().nullable() })
    .nullable(),
  employments: z.array(employmentSummarySchema),
  pensionServiceYears: z.number(),
  pensionServiceMonths: z.number(),
  tasks: z.array(memberTaskSchema),
});
export type DashboardSummaryWire = z.infer<typeof dashboardSummarySchema>;
