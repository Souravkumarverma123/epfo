import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../../trpc";
import { assistantChatInput, assistantChatOutput } from "./schema";

/**
 * Public, not protectedProcedure — the assistant works for signed-out
 * visitors too (general nav/explainer questions via search_help). It's
 * ctx.member that decides, inside AssistantService, whether the
 * personal-data tools are even offered to the model — this route just
 * passes through whichever member (or null) the session resolved to.
 */
export const assistantRouter = router({
  chat: publicProcedure
    .meta({ openapi: { method: "POST", path: "/assistant/chat" } })
    .input(assistantChatInput)
    .output(assistantChatOutput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.assistantService) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The AI Assistant isn't configured (no OpenAI API key set).",
        });
      }
      const reply = await ctx.assistantService.chat({
        memberId: ctx.member?.id ?? null,
        lang: input.lang,
        history: input.history,
        message: input.message,
      });
      return { reply };
    }),
});
