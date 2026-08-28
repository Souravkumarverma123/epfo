/**
 * Column helpers shared across every model file. Not a model itself — no
 * `export * from "./shared"` in schema.ts, just imported where needed.
 */

import { timestamp } from "drizzle-orm/pg-core";

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
