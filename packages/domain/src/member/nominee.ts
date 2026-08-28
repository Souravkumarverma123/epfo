/** Bilingual labels for nominee relationships. Pure — just a lookup. */

export const NOMINEE_RELATIONSHIPS = ["SPOUSE", "CHILD", "PARENT", "OTHER"] as const;
export type NomineeRelationship = (typeof NOMINEE_RELATIONSHIPS)[number];

const LABELS: Record<NomineeRelationship, { en: string; hi: string }> = {
  SPOUSE: { en: "spouse", hi: "जीवनसाथी" },
  CHILD: { en: "child", hi: "संतान" },
  PARENT: { en: "parent", hi: "माता-पिता" },
  OTHER: { en: "other", hi: "अन्य" },
};

export function nomineeRelationshipLabel(relationship: string): { en: string; hi: string } {
  return LABELS[relationship as NomineeRelationship] ?? { en: relationship, hi: relationship };
}
