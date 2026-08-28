/**
 * Mock login — supporting tables, not named in PRD §11 (see comment below).
 */

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./shared";
import { members } from "./member";

/**
 * PRD §6: mock identity, no real credentials. A real deployment replaces
 * this pair of tables with an OIDC provider (PRD §23) — the rest of the app
 * only ever sees "there is a session for this member", so the swap touches
 * nothing downstream.
 */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    /** Stored in the clear — these are synthetic demo codes, not secrets. */
    code: text("code").notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("otp_codes_member_idx").on(t.memberId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_member_idx").on(t.memberId)],
);
