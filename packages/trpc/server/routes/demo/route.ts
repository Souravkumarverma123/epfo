import { publicProcedure, router } from "../../trpc";
import { z, zodEmptyInputModel, zodUndefinedModel } from "../../schema";
import { dependencyStateSchema, setDependencyInputSchema } from "./schema";

/**
 * Demo control panel — not a citizen-facing feature and not gated behind
 * member auth. This is the operational panel PRD §36/§40 describes in
 * miniature: someone driving the demo flips a dependency, the citizen's own
 * claim status page (polling independently) reacts on its own within one
 * step interval. In a real deployment this whole router would not exist —
 * it stands in for an actual circuit breaker / ops console.
 */
const DEMO_DEPENDENCIES = ["kyc", "payment"] as const;

export const demoRouter = router({
  getDependencyStates: publicProcedure
    .meta({ openapi: { method: "GET", path: "/demo/dependencies" } })
    .input(zodUndefinedModel)
    .output(z.array(dependencyStateSchema))
    .query(async ({ ctx }) => {
      return Promise.all(
        DEMO_DEPENDENCIES.map(async (dependency) => ({
          dependency,
          mode: await ctx.dependencyRepo.getMode(dependency),
        })),
      );
    }),

  setDependencyState: publicProcedure
    .meta({ openapi: { method: "POST", path: "/demo/dependencies" } })
    .input(setDependencyInputSchema)
    .output(zodEmptyInputModel)
    .mutation(async ({ ctx, input }) => {
      await ctx.dependencyRepo.setMode(input.dependency, input.mode);
      return {};
    }),
});
