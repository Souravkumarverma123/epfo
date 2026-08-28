import { TRPCError } from "@trpc/server";
import { InvalidOtpError, InvalidUanError, type MemberRow } from "@repo/application";
import { z, zodEmptyInputModel, zodUndefinedModel } from "../../schema";
import { publicProcedure, router } from "../../trpc";
import { SESSION_COOKIE_MAX_AGE_MS, SESSION_COOKIE_NAME } from "../../session-cookie";
import { memberProfileSchema, type MemberProfile } from "./schema";

function toMemberProfile(member: MemberRow): MemberProfile {
  return {
    id: member.id,
    uan: member.uan,
    fullName: member.fullName,
    kycStatus: member.kycStatus,
    maskedAadhaar: member.maskedAadhaar,
    maskedPan: member.maskedPan,
    mobile: member.mobile,
    email: member.email,
  };
}

const uanInput = z.object({
  uan: z.string().min(10).describe("Universal Account Number, spaces allowed"),
});

export const authRouter = router({
  requestOtp: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/request-otp" } })
    .input(uanInput)
    .output(
      z.object({
        requested: z.literal(true),
        // DEMO ONLY: there is no SMS/notification integration yet (PRD §14,
        // Phase 4). A real deployment removes this field entirely and the
        // code never leaves the server.
        devOtp: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { devOtp } = await ctx.authService.requestOtp(input.uan);
        return { requested: true as const, devOtp };
      } catch (err) {
        if (err instanceof InvalidUanError) {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        throw err;
      }
    }),

  verifyOtp: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/verify-otp" } })
    .input(uanInput.extend({ code: z.string().length(6) }))
    .output(memberProfileSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { sessionId, member } = await ctx.authService.verifyOtp(input.uan, input.code);
        ctx.res.cookie(SESSION_COOKIE_NAME, sessionId, {
          httpOnly: true,
          sameSite: "lax",
          // This project's own NODE_ENV convention (apps/api/src/env.ts) uses
          // "prod"; Node's built-in type only knows "production" — check the
          // raw string so a cookie doesn't ship insecure in either convention.
          secure: (process.env.NODE_ENV as string) === "prod" || process.env.NODE_ENV === "production",
          maxAge: SESSION_COOKIE_MAX_AGE_MS,
          path: "/",
        });
        return toMemberProfile(member);
      } catch (err) {
        if (err instanceof InvalidUanError || err instanceof InvalidOtpError) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
        }
        throw err;
      }
    }),

  me: publicProcedure
    .meta({ openapi: { method: "GET", path: "/auth/me" } })
    .input(zodUndefinedModel)
    .output(z.object({ member: memberProfileSchema.nullable() }))
    .query(async ({ ctx }) => {
      return { member: ctx.member ? toMemberProfile(ctx.member) : null };
    }),

  signOut: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/sign-out" } })
    .input(zodEmptyInputModel)
    .output(z.object({ signedOut: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      if (ctx.sessionId) await ctx.authService.signOut(ctx.sessionId);
      ctx.res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return { signedOut: true as const };
    }),
});
