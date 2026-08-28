import { nomineeRelationshipLabel, paiseToWire } from "@repo/domain";
import { protectedProcedure, router } from "../../trpc";
import { zodUndefinedModel } from "../../schema";
import { dashboardSummarySchema, type DashboardSummaryWire } from "./schema";
import { passbookInputSchema, passbookOutputSchema, type PassbookOutputWire } from "./passbook-schema";
import { memberProfileDetailSchema, type MemberProfileDetailWire } from "./profile-schema";

export const memberRouter = router({
  // Most fields come straight off ctx.member (already resolved once per
  // request in context.ts) — only nominees need a repository call, since
  // they live in their own table.
  getProfile: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/member/profile" } })
    .input(zodUndefinedModel)
    .output(memberProfileDetailSchema)
    .query(async ({ ctx }): Promise<MemberProfileDetailWire> => {
      const m = ctx.member;
      const nominees = await ctx.memberService.listNominees(m.id);
      return {
        fullName: m.fullName,
        dateOfBirth: m.dateOfBirth,
        maskedAadhaar: m.maskedAadhaar,
        maskedPan: m.maskedPan,
        kycStatus: m.kycStatus,
        mobile: m.mobile,
        email: m.email,
        bankAccountMasked: m.bankAccountMasked,
        bankIfsc: m.bankIfsc,
        nominees: nominees.map((n) => ({
          fullName: n.fullName,
          relationship: nomineeRelationshipLabel(n.relationship),
          sharePercentage: n.sharePercentage,
          setOn: n.setOn,
        })),
      };
    }),

  getDashboardSummary: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/member/dashboard" } })
    .input(zodUndefinedModel)
    .output(dashboardSummarySchema)
    .query(async ({ ctx }): Promise<DashboardSummaryWire> => {
      const summary = await ctx.memberService.getDashboardSummary(ctx.member.id);

      return {
        fullName: summary.member.fullName,
        uan: summary.member.uan,
        totalBalancePaise: paiseToWire(summary.totalBalancePaise),
        lastContribution: summary.lastContribution
          ? {
              amountPaise: paiseToWire(summary.lastContribution.amountPaise),
              month: summary.lastContribution.month,
              onTime: summary.lastContribution.onTime,
            }
          : null,
        latestInterestCredit: summary.latestInterestCredit
          ? {
              amountPaise: paiseToWire(summary.latestInterestCredit.amountPaise),
              reference: summary.latestInterestCredit.reference,
            }
          : null,
        employments: summary.employments.map((e) => ({
          employerName: e.employment.employerName,
          joinedOn: e.employment.joinedOn,
          exitedOn: e.employment.exitedOn,
          status: e.employment.status,
          contributedPaise: paiseToWire(e.contributedPaise),
        })),
        pensionServiceYears: summary.pensionService.years,
        pensionServiceMonths: summary.pensionService.months,
        tasks: summary.tasks,
      };
    }),

  getPassbook: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/member/passbook" } })
    .input(passbookInputSchema)
    .output(passbookOutputSchema)
    .query(async ({ ctx, input }): Promise<PassbookOutputWire> => {
      const result = await ctx.passbookService.getPassbook(ctx.member.id, {
        employmentId: input.employmentId,
        financialYear: input.financialYear,
      });

      return {
        employments: result.employments,
        financialYears: result.financialYears,
        selectedEmploymentId: result.selectedEmploymentId,
        selectedFinancialYear: result.selectedFinancialYear,
        rows: result.rows.map((r) => ({
          type: r.type,
          label: r.label,
          employeeSharePaise: paiseToWire(r.employeeSharePaise),
          employerSharePaise: paiseToWire(r.employerSharePaise),
          pensionSharePaise: paiseToWire(r.pensionSharePaise),
          balanceAfterPaise: paiseToWire(r.balanceAfterPaise),
        })),
      };
    }),
});
