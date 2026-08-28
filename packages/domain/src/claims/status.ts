/**
 * Claim state machine (PRD §13).
 *
 * Pure domain code: no I/O, no database, no framework. Transitions are
 * declared once, here, so status rules are never scattered across the
 * codebase (PRD §13: "do not scatter status checks throughout the code").
 */

export const CLAIM_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "VALIDATING",
  "KYC_PENDING",
  "ELIGIBILITY_CHECK",
  "RISK_CHECK",
  "APPROVAL_PENDING",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAYMENT_PROCESSING",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "ACTION_REQUIRED",
  "FAILED_RETRYABLE",
  "FAILED_PERMANENT",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/**
 * Terminal states end the workflow. FAILED_RETRYABLE and ACTION_REQUIRED are
 * deliberately NOT terminal: the whole premise of EPFO One is that a failure
 * is a recoverable state rather than a dead end (PRD §4).
 */
export const TERMINAL_STATUSES = [
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "FAILED_PERMANENT",
] as const satisfies readonly ClaimStatus[];

const TERMINAL_SET = new Set<ClaimStatus>(TERMINAL_STATUSES);

export function isTerminal(status: ClaimStatus): boolean {
  return TERMINAL_SET.has(status);
}

/** The happy path, in order. Drives the citizen-facing progress timeline. */
export const HAPPY_PATH: readonly ClaimStatus[] = [
  "SUBMITTED",
  "VALIDATING",
  "KYC_PENDING",
  "ELIGIBILITY_CHECK",
  "RISK_CHECK",
  "APPROVAL_PENDING",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAYMENT_PROCESSING",
  "COMPLETED",
];

/**
 * Every legal transition. Anything not listed is rejected by `assertTransition`.
 * Most in-flight states can move to ACTION_REQUIRED (we need something from
 * the citizen) or FAILED_RETRYABLE (a dependency is misbehaving, claim is
 * safe) — and can come back out again once resolved.
 */
const TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["VALIDATING", "REJECTED", "CANCELLED", "FAILED_RETRYABLE"],
  VALIDATING: [
    "KYC_PENDING",
    "REJECTED",
    "ACTION_REQUIRED",
    "FAILED_RETRYABLE",
    "CANCELLED",
  ],
  KYC_PENDING: [
    "ELIGIBILITY_CHECK",
    "REJECTED",
    "ACTION_REQUIRED",
    "FAILED_RETRYABLE",
    "CANCELLED",
  ],
  ELIGIBILITY_CHECK: [
    "RISK_CHECK",
    "REJECTED",
    "ACTION_REQUIRED",
    "FAILED_RETRYABLE",
    "CANCELLED",
  ],
  RISK_CHECK: [
    "APPROVAL_PENDING",
    "REJECTED",
    "ACTION_REQUIRED",
    "FAILED_RETRYABLE",
    "CANCELLED",
  ],
  APPROVAL_PENDING: ["APPROVED", "REJECTED", "ACTION_REQUIRED", "FAILED_RETRYABLE"],
  APPROVED: ["PAYMENT_PENDING", "FAILED_RETRYABLE"],
  PAYMENT_PENDING: ["PAYMENT_PROCESSING", "FAILED_RETRYABLE", "ACTION_REQUIRED"],
  PAYMENT_PROCESSING: [
    "COMPLETED",
    "FAILED_RETRYABLE",
    "FAILED_PERMANENT",
    "ACTION_REQUIRED",
  ],
  ACTION_REQUIRED: [
    "VALIDATING",
    "KYC_PENDING",
    "ELIGIBILITY_CHECK",
    "RISK_CHECK",
    "APPROVAL_PENDING",
    "PAYMENT_PENDING",
    "CANCELLED",
    "REJECTED",
  ],
  FAILED_RETRYABLE: [
    "VALIDATING",
    "KYC_PENDING",
    "ELIGIBILITY_CHECK",
    "RISK_CHECK",
    "APPROVAL_PENDING",
    "APPROVED",
    "PAYMENT_PENDING",
    "PAYMENT_PROCESSING",
    "FAILED_PERMANENT",
    "CANCELLED",
  ],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED_PERMANENT: [],
};

export function canTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidClaimTransitionError extends Error {
  readonly from: ClaimStatus;
  readonly to: ClaimStatus;

  constructor(from: ClaimStatus, to: ClaimStatus) {
    super(`Illegal claim transition: ${from} -> ${to}`);
    this.name = "InvalidClaimTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function assertTransition(from: ClaimStatus, to: ClaimStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidClaimTransitionError(from, to);
  }
}

/**
 * Where a status sits on the citizen-facing timeline.
 *  - `done`    : this step is behind us
 *  - `active`  : this is what the system is doing right now
 *  - `pending` : not reached yet
 */
export type TimelineState = "done" | "active" | "pending";

export function timelineStateFor(step: ClaimStatus, current: ClaimStatus): TimelineState {
  const stepIndex = HAPPY_PATH.indexOf(step);
  const currentIndex = HAPPY_PATH.indexOf(current);

  if (stepIndex === -1 || currentIndex === -1) return "pending";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return current === "COMPLETED" ? "done" : "active";
  return "pending";
}
