import { describe, expect, it } from "vitest";
import { HAPPY_PATH } from "./status";
import { dependencyGateFor, nextHappyPathStatus } from "./progression";

describe("nextHappyPathStatus", () => {
  it("advances one step at a time along the happy path", () => {
    expect(nextHappyPathStatus("SUBMITTED")).toBe("VALIDATING");
    expect(nextHappyPathStatus("PAYMENT_PROCESSING")).toBe("COMPLETED");
  });

  it("stops at the end rather than wrapping", () => {
    expect(nextHappyPathStatus("COMPLETED")).toBeNull();
  });

  it("returns null for a status that is not on the happy path", () => {
    expect(nextHappyPathStatus("FAILED_RETRYABLE")).toBeNull();
    expect(nextHappyPathStatus("REJECTED")).toBeNull();
    expect(nextHappyPathStatus("DRAFT")).toBeNull();
  });

  it("reaches COMPLETED from SUBMITTED in exactly HAPPY_PATH.length - 1 steps", () => {
    let status = HAPPY_PATH[0]!;
    let steps = 0;
    while (true) {
      const next = nextHappyPathStatus(status);
      if (!next) break;
      status = next;
      steps++;
      expect(steps).toBeLessThan(50); // guards against a cycle
    }
    expect(status).toBe("COMPLETED");
    expect(steps).toBe(HAPPY_PATH.length - 1);
  });
});

describe("dependencyGateFor", () => {
  it("gates exactly the two steps that call something external", () => {
    expect(dependencyGateFor("KYC_PENDING")).toBe("kyc");
    expect(dependencyGateFor("PAYMENT_PENDING")).toBe("payment");
  });

  it("leaves purely internal steps ungated", () => {
    for (const step of ["SUBMITTED", "VALIDATING", "ELIGIBILITY_CHECK", "RISK_CHECK"] as const) {
      expect(dependencyGateFor(step)).toBeUndefined();
    }
  });
});
