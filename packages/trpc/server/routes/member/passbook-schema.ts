import { z } from "zod";

const paiseWire = z.string().describe("Integer paise, as a string");

export const passbookInputSchema = z.object({
  employmentId: z.string().uuid().optional(),
  financialYear: z.string().optional(),
});

export const passbookRowSchema = z.object({
  type: z.enum(["CONTRIBUTION", "INTEREST"]),
  label: z.string(),
  employeeSharePaise: paiseWire,
  employerSharePaise: paiseWire,
  pensionSharePaise: paiseWire,
  balanceAfterPaise: paiseWire,
});

export const passbookOutputSchema = z.object({
  employments: z.array(z.object({ id: z.string(), employerName: z.string(), isActive: z.boolean() })),
  financialYears: z.array(z.string()),
  selectedEmploymentId: z.string(),
  selectedFinancialYear: z.string(),
  rows: z.array(passbookRowSchema),
});
export type PassbookOutputWire = z.infer<typeof passbookOutputSchema>;
