/**
 * Employer login — a second, independent persona (PRD's citizen journey has
 * a member; the real EPFO also has an employer/establishment journey). Not
 * named in PRD §11's member-focused domain model, so kept in its own file
 * rather than bolted onto member.ts.
 *
 * Mirrors the member auth tables (auth.ts) deliberately: same mock-OTP shape,
 * same "session lives in its own table, resolved once per request" pattern.
 * A real deployment would replace employer identity with a proper employer
 * IAM/OIDC integration the same way auth.ts's comment describes for members —
 * this file is the mock stand-in for that.
 */

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./shared";

/**
 * Establishment — the employer's registered identity. establishmentCode is
 * the login handle (this project's stand-in for a real employer's
 * registration credentials), and is also the same value already stored on
 * `employments.establishmentCode` — that's how an employer's dashboard finds
 * "its" employees without a new foreign key: it's a join on the code, not a
 * relation that had to be retrofitted onto existing seed data.
 */
export const establishments = pgTable(
  "establishments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establishmentCode: text("establishment_code").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("establishments_code_idx").on(t.establishmentCode)],
);

export const employerOtpCodes = pgTable(
  "employer_otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establishmentId: uuid("establishment_id")
      .notNull()
      .references(() => establishments.id),
    /** Stored in the clear — synthetic demo codes, not secrets (see auth.ts). */
    code: text("code").notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("employer_otp_codes_establishment_idx").on(t.establishmentId)],
);

export const employerSessions = pgTable(
  "employer_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establishmentId: uuid("establishment_id")
      .notNull()
      .references(() => establishments.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("employer_sessions_establishment_idx").on(t.establishmentId)],
);
