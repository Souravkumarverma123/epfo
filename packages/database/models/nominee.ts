/**
 * Nominee — not in PRD §11's core table, but a real EPFO KYC concept (who
 * receives the PF balance if the member dies). Added because the design
 * shows it on the "Your details" screen and a citizen can genuinely have
 * more than one nominee with split shares — modelled as a list, not a
 * single flattened field, even though the demo seeds only one.
 */

import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./shared";
import { members } from "./member";

export const nominees = pgTable(
  "nominees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    fullName: text("full_name").notNull(),
    relationship: text("relationship").notNull(), // SPOUSE | CHILD | PARENT | OTHER
    /** Out of 100 — every member's nominees should sum to 100, but nothing
     *  in this prototype enforces that across rows (would need a check
     *  spanning multiple rows, left as a known gap). */
    sharePercentage: integer("share_percentage").notNull(),
    /** ISO date this nomination was last confirmed/set. */
    setOn: text("set_on").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("nominees_member_idx").on(t.memberId)],
);
