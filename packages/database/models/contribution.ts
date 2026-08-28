/**
 * Contribution — PRD §11 Domain Model.
 */

import { bigint, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./shared";
import { employments, members } from "./member";

/** Contribution — "member/employment, employee/employer amounts, month, posting date, status, reference" */
export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => employments.id),
    /** Contribution month as YYYY-MM. */
    month: text("month").notNull(),
    employeeSharePaise: bigint("employee_share_paise", { mode: "bigint" }).notNull(),
    employerSharePaise: bigint("employer_share_paise", { mode: "bigint" }).notNull(),
    /** Pension (EPS) share — not named in §11's short field list but needed
     *  to compute Form 10C eligibility realistically rather than as a flat
     *  guess against the total balance. */
    pensionSharePaise: bigint("pension_share_paise", { mode: "bigint" }).notNull(),
    postedOn: timestamp("posted_on", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("POSTED"), // POSTED | LATE | MISSING
    reference: text("reference"),
    createdAt: createdAt(),
  },
  (t) => [
    index("contributions_member_idx").on(t.memberId),
    uniqueIndex("contributions_member_month_idx").on(t.memberId, t.employmentId, t.month),
  ],
);
