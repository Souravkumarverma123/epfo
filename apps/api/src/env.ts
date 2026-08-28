import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "prod"]).default("development"),
  BASE_URL: z.string().default("http://localhost:8000"),
  // Session cookies need a specific CORS origin + credentials:true — "*"
  // cannot be paired with credentials per the CORS spec.
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  // Optional in local dev (the AI Assistant just errors cleanly if a
  // request comes in without one set) — required in prod, set via
  // .env.prod on the deploy box, never committed.
  OPENAI_API_KEY: z.string().optional(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
