import { z } from "zod";

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const assistantChatInput = z.object({
  message: z.string().min(1).max(2000),
  // Client sends its own message list back each turn — no server-side
  // chat history table (kept ephemeral and honest: nothing here claims
  // to persist a conversation).
  history: z.array(assistantMessageSchema).max(20).default([]),
  // The server has no other view of the site's language toggle (it's
  // client-side only, see design/lang.tsx) — passed explicitly each turn.
  lang: z.enum(["en", "hi"]).default("en"),
});

export const assistantChatOutput = z.object({
  reply: z.string(),
});
