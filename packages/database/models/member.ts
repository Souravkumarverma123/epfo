/**
 * Member, Employment — PRD §11 Domain Model.
 */

import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./shared";

/** Member — "id, UAN, identity data, contact information, status, timestamps" */
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Universal Account Number — synthetic, 12 digits. Also the login handle. */
    uan: text("uan").notNull(),
    fullName: text("full_name").notNull(),
    dateOfBirth: text("date_of_birth").notNull(), // ISO date
    maskedAadhaar: text("masked_aadhaar"),
    maskedPan: text("masked_pan"),
    mobile: text("mobile").notNull(),
    email: text("email"),
    bankAccountMasked: text("bank_account_masked"),
    bankIfsc: text("bank_ifsc"),
    /** "status" — KYC status drives the KYC step of the claim workflow. */
    kycStatus: text("kyc_status").notNull().default("PENDING"), // PENDING | VERIFIED | FAILED
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("members_uan_idx").on(t.uan)],
);

/** Employment — "member, employer, joining/exit dates, employment status" */
export const employments = pgTable(
  "employments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    employerName: text("employer_name").notNull(),
    establishmentCode: text("establishment_code").notNull(),
    joinedOn: text("joined_on").notNull(),
    exitedOn: text("exited_on"), // null while still employed
    /** "employment status", stated explicitly rather than inferred from exitedOn. */
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | EXITED
    createdAt: createdAt(),
  },
  (t) => [index("employments_member_idx").on(t.memberId)],
);
