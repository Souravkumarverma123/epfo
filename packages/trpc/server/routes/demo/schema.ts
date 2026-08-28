import { z } from "zod";

export const dependencyModeSchema = z.enum(["UP", "DOWN", "SLOW", "TIMEOUT"]);

export const dependencyStateSchema = z.object({
  dependency: z.string(),
  mode: dependencyModeSchema,
});

export const setDependencyInputSchema = z.object({
  dependency: z.enum(["kyc", "payment"]),
  mode: dependencyModeSchema,
});
