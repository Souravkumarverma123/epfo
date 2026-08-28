import { paiseToWire } from "@repo/domain";
import { protectedProcedure, router } from "../../trpc";
import { zodUndefinedModel } from "../../schema";
import { dashboardSummarySchema, type DashboardSummaryWire } from "./schema";

export const memberRouter = router({
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
});
