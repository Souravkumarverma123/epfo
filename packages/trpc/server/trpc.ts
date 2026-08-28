import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext } from "./context";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

/**
 * Every procedure that reads or changes a specific member's data should be
 * built on this, not publicProcedure — it's the one place "is someone signed
 * in" is checked, so no route can forget to check it. `ctx.member` is
 * non-null inside the resolver, so procedures don't need to null-check it
 * themselves.
 */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.member) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required" });
  }
  return next({ ctx: { ...ctx, member: ctx.member } });
});

/** Same idea as protectedProcedure, for the employer persona — checks
 *  ctx.employer instead of ctx.member. The two are independent: a request
 *  can carry a member session, an employer session, both, or neither. */
export const protectedEmployerProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.employer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Employer sign in required" });
  }
  return next({ ctx: { ...ctx, employer: ctx.employer } });
});
