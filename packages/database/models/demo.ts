/**
 * Demo instrumentation — supporting table, not named in PRD §11.
 */

import { pgTable, text } from "drizzle-orm/pg-core";
import { updatedAt } from "./shared";

/**
 * Failure-injection switches for the live demo (PRD §40). Named
 * `dependency_state`, not `chaos_switches`: in a real deployment this same
 * shape (dependency name → UP/DOWN/SLOW) is what a circuit breaker's state
 * table looks like — so the demo table isn't throwaway, it's the seed of a
 * real one.
 */
export const dependencyState = pgTable("dependency_state", {
  /** e.g. 'kyc', 'payment', 'notification' */
  dependency: text("dependency").primaryKey(),
  mode: text("mode").notNull().default("UP"), // UP | DOWN | SLOW | TIMEOUT
  updatedAt: updatedAt(),
});
