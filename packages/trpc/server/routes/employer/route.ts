import { TRPCError } from "@trpc/server";
import { InvalidEmployerOtpError, InvalidEstablishmentCodeError, type EstablishmentRow } from "@repo/application";
import { z, zodEmptyInputModel, zodUndefinedModel } from "../../schema";
import { protectedEmployerProcedure, publicProcedure, router } from "../../trpc";
import { EMPLOYER_SESSION_COOKIE_MAX_AGE_MS, EMPLOYER_SESSION_COOKIE_NAME } from "../../employer-session-cookie";
import { establishmentSchema, employerDashboardSchema, type EstablishmentProfile } from "./schema";

function toEstablishmentProfile(establishment: EstablishmentRow): EstablishmentProfile {
  return {
    id: establishment.id,
    establishmentCode: establishment.establishmentCode,
    name: establishment.name,
    city: establishment.city,
  };
}

const establishmentCodeInput = z.object({
  establishmentCode: z.string().min(6).describe("Employer establishment code"),
});

/** Mirrors authRouter exactly, one persona removed — mock OTP login for the
 *  employer/establishment identity (see EmployerAuthService). */
export const employerAuthRouter = router({
  requestOtp: publicProcedure
    .meta({ openapi: { method: "POST", path: "/employer-auth/request-otp" } })
    .input(establishmentCodeInput)
    .output(
      z.object({
        requested: z.literal(true),
        // DEMO ONLY — see authRouter.requestOtp's identical comment.
        devOtp: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { devOtp } = await ctx.employerAuthService.requestOtp(input.establishmentCode);
        return { requested: true as const, devOtp };
      } catch (err) {
        if (err instanceof InvalidEstablishmentCodeError) {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        throw err;
      }
    }),

  verifyOtp: publicProcedure
    .meta({ openapi: { method: "POST", path: "/employer-auth/verify-otp" } })
    .input(establishmentCodeInput.extend({ code: z.string().length(6) }))
    .output(establishmentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { sessionId, establishment } = await ctx.employerAuthService.verifyOtp(
          input.establishmentCode,
          input.code,
        );
        ctx.res.cookie(EMPLOYER_SESSION_COOKIE_NAME, sessionId, {
          httpOnly: true,
          sameSite: "lax",
          secure: (process.env.NODE_ENV as string) === "prod" || process.env.NODE_ENV === "production",
          maxAge: EMPLOYER_SESSION_COOKIE_MAX_AGE_MS,
          path: "/",
        });
        return toEstablishmentProfile(establishment);
      } catch (err) {
        if (err instanceof InvalidEstablishmentCodeError || err instanceof InvalidEmployerOtpError) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
        }
        throw err;
      }
    }),

  me: publicProcedure
    .meta({ openapi: { method: "GET", path: "/employer-auth/me" } })
    .input(zodUndefinedModel)
    .output(z.object({ establishment: establishmentSchema.nullable() }))
    .query(async ({ ctx }) => {
      return { establishment: ctx.employer ? toEstablishmentProfile(ctx.employer) : null };
    }),

  signOut: publicProcedure
    .meta({ openapi: { method: "POST", path: "/employer-auth/sign-out" } })
    .input(zodEmptyInputModel)
    .output(z.object({ signedOut: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      if (ctx.employerSessionId) await ctx.employerAuthService.signOut(ctx.employerSessionId);
      ctx.res.clearCookie(EMPLOYER_SESSION_COOKIE_NAME, { path: "/" });
      return { signedOut: true as const };
    }),
});

/** The employer's own data — view-only (see the scoping decision this
 *  feature was built under, and EmployerService's comment). */
export const employerRouter = router({
  getDashboard: protectedEmployerProcedure
    .meta({ openapi: { method: "GET", path: "/employer/dashboard" } })
    .input(zodUndefinedModel)
    .output(employerDashboardSchema)
    .query(async ({ ctx }) => {
      const dashboard = await ctx.employerService.getDashboard(ctx.employer);
      return {
        establishment: toEstablishmentProfile(dashboard.establishment),
        employees: dashboard.employees,
        activeCount: dashboard.activeCount,
        pendingKycCount: dashboard.pendingKycCount,
      };
    }),
});
