/**
 * Claim progression (PRD §14, in place of Inngest — documented substitute,
 * see ClaimProgressionService). Pure — decides *what* the next step is and
 * *which* dependency gates it; the application layer decides *when* to call
 * this and *how* to check the dependency.
 */

import { HAPPY_PATH, type ClaimStatus } from "./status";

/** The dependency each step needs before it can pass. Steps not listed
 *  always succeed — they exist to make the timeline visible, not because
 *  they call anything external. */
export const STATUS_DEPENDENCY: Partial<Record<ClaimStatus, string>> = {
  KYC_PENDING: "kyc",
  PAYMENT_PENDING: "payment",
};

/** The next status on the happy path, or null if already at the end. */
export function nextHappyPathStatus(status: ClaimStatus): ClaimStatus | null {
  const index = HAPPY_PATH.indexOf(status);
  if (index === -1 || index === HAPPY_PATH.length - 1) return null;
  return HAPPY_PATH[index + 1]!;
}

export function dependencyGateFor(status: ClaimStatus): string | undefined {
  return STATUS_DEPENDENCY[status];
}
