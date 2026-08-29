import { describe, expect, it } from "vitest";
import {
  CLAIM_STATUSES,
  HAPPY_PATH,
  InvalidClaimTransitionError,
  TERMINAL_STATUSES,
  assertTransition,
  canTransition,
  isTerminal,
  timelineStateFor,
  type ClaimStatus,
} from "./status";

describe("claim state machine (PRD §13)", () => {
  it("walks the entire happy path with every step legal", () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      const from = HAPPY_PATH[i]!;
      const to = HAPPY_PATH[i + 1]!;
      expect(canTransition(from, to), `${from} -> ${to} should be legal`).toBe(true);
    }
  });

  it("refuses to skip a step on the happy path", () => {
    // SUBMITTED straight to APPROVED would mean the KYC, eligibility and risk
    // steps never ran. The state machine is the only thing preventing that.
    expect(canTransition("SUBMITTED", "APPROVED")).toBe(false);
    expect(canTransition("VALIDATING", "COMPLETED")).toBe(false);
    expect(canTransition("DRAFT", "PAYMENT_PENDING")).toBe(false);
  });

  it("throws InvalidClaimTransitionError carrying both ends of the illegal move", () => {
    expect(() => assertTransition("SUBMITTED", "COMPLETED")).toThrow(InvalidClaimTransitionError);
    try {
      assertTransition("SUBMITTED", "COMPLETED");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidClaimTransitionError);
      expect((err as InvalidClaimTransitionError).from).toBe("SUBMITTED");
      expect((err as InvalidClaimTransitionError).to).toBe("COMPLETED");
    }
  });

  it("lets no transition out of a terminal state", () => {
    for (const terminal of TERMINAL_STATUSES) {
      for (const target of CLAIM_STATUSES) {
        expect(canTransition(terminal, target), `${terminal} -> ${target}`).toBe(false);
      }
    }
  });

  it("does not treat a recoverable failure as terminal — PRD §4", () => {
    // The premise of the whole system: a failure is a state you come back
    // from. If either of these ever became terminal, a held claim would be a
    // lost claim.
    expect(isTerminal("FAILED_RETRYABLE")).toBe(false);
    expect(isTerminal("ACTION_REQUIRED")).toBe(false);
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("FAILED_PERMANENT")).toBe(true);
  });

  it("can re-enter every gated happy-path step from FAILED_RETRYABLE", () => {
    // Recovery re-attempts the exact step that failed. Any gated step that
    // could not be re-entered would strand a claim there permanently.
    const resumable: ClaimStatus[] = [
      "VALIDATING",
      "KYC_PENDING",
      "ELIGIBILITY_CHECK",
      "RISK_CHECK",
      "APPROVAL_PENDING",
      "APPROVED",
      "PAYMENT_PENDING",
      "PAYMENT_PROCESSING",
    ];
    for (const step of resumable) {
      expect(canTransition("FAILED_RETRYABLE", step), `resume into ${step}`).toBe(true);
    }
  });

  it("allows every in-flight step to hold at FAILED_RETRYABLE", () => {
    // Anything on the happy path except its endpoints must be able to park
    // safely; otherwise a dependency outage at that step becomes an error.
    const inFlight = HAPPY_PATH.filter((s) => s !== "COMPLETED");
    for (const step of inFlight) {
      expect(canTransition(step, "FAILED_RETRYABLE"), `${step} must be able to hold`).toBe(true);
    }
  });
});

describe("timelineStateFor", () => {
  it("marks earlier steps done, the current step active, later steps pending", () => {
    expect(timelineStateFor("SUBMITTED", "RISK_CHECK")).toBe("done");
    expect(timelineStateFor("RISK_CHECK", "RISK_CHECK")).toBe("active");
    expect(timelineStateFor("APPROVED", "RISK_CHECK")).toBe("pending");
  });

  it("shows COMPLETED as done rather than active — nothing is still running", () => {
    expect(timelineStateFor("COMPLETED", "COMPLETED")).toBe("done");
  });

  it("returns pending for statuses that are not on the happy path", () => {
    // The caller substitutes the step being retried before calling this; a
    // raw FAILED_RETRYABLE has no position on the timeline.
    expect(timelineStateFor("SUBMITTED", "FAILED_RETRYABLE")).toBe("pending");
    expect(timelineStateFor("REJECTED", "SUBMITTED")).toBe("pending");
  });
});
