import { describe, expect, it } from "vitest";
import {
  checkAmount,
  checkEligibility,
  type EligibilityContext,
} from "./eligibility";

const base: EligibilityContext = {
  totalBalancePaise: 100_000_00n, // ₹1,00,000
  employeeSharePaise: 60_000_00n, // ₹60,000
  serviceYears: 8,
  hasExited: false,
  monthsSinceExit: 0,
};

const ctx = (over: Partial<EligibilityContext> = {}): EligibilityContext => ({ ...base, ...over });

describe("checkEligibility — FORM_19 (full settlement)", () => {
  it("refuses while the member is still employed", () => {
    const r = checkEligibility("FORM_19", ctx({ hasExited: false }));
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("STILL_EMPLOYED");
    expect(r.maxAmountPaise).toBe(0n);
  });

  it("refuses inside the two-month waiting period", () => {
    const r = checkEligibility("FORM_19", ctx({ hasExited: true, monthsSinceExit: 1 }));
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("WAITING_PERIOD");
  });

  it("allows the full balance once exited and past the waiting period", () => {
    const r = checkEligibility("FORM_19", ctx({ hasExited: true, monthsSinceExit: 2 }));
    expect(r.eligible).toBe(true);
    expect(r.maxAmountPaise).toBe(base.totalBalancePaise);
  });
});

describe("checkEligibility — FORM_10C (pension withdrawal)", () => {
  it("refuses at ten years of service, where a pension replaces the withdrawal", () => {
    const r = checkEligibility("FORM_10C", ctx({ hasExited: true, serviceYears: 10 }));
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("SERVICE_TOO_LONG");
  });

  it("allows just under ten years", () => {
    const r = checkEligibility("FORM_10C", ctx({ hasExited: true, serviceYears: 9.9 }));
    expect(r.eligible).toBe(true);
  });

  it("reports every failing reason at once rather than the first", () => {
    // A citizen should learn both problems in one round trip.
    const r = checkEligibility("FORM_10C", ctx({ hasExited: false, serviceYears: 12 }));
    expect(r.reasons).toEqual(expect.arrayContaining(["STILL_EMPLOYED", "SERVICE_TOO_LONG"]));
  });
});

describe("checkEligibility — FORM_31 (advance while employed)", () => {
  it("requires a purpose", () => {
    const r = checkEligibility("FORM_31", ctx());
    expect(r.eligible).toBe(false);
    expect(r.reasons).toEqual(["PURPOSE_REQUIRED"]);
  });

  it("enforces the per-purpose minimum service", () => {
    const r = checkEligibility("FORM_31", ctx({ serviceYears: 3 }), "EDUCATION");
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("INSUFFICIENT_SERVICE");
  });

  it("caps a medical advance at the whole employee share", () => {
    const r = checkEligibility("FORM_31", ctx(), "MEDICAL");
    expect(r.eligible).toBe(true);
    expect(r.maxAmountPaise).toBe(base.employeeSharePaise);
  });

  it("caps education at half the employee share, in exact integer paise", () => {
    const r = checkEligibility("FORM_31", ctx(), "EDUCATION");
    expect(r.maxAmountPaise).toBe(30_000_00n);
  });

  it("computes fractional caps without floating-point drift", () => {
    // 0.9 * 3333333 paise. Done in floats this is 2999999.7000000004;
    // the rule multiplies before dividing, so the answer stays an integer.
    const r = checkEligibility(
      "FORM_31",
      ctx({ employeeSharePaise: 3_333_333n, serviceYears: 6 }),
      "HOUSE_PURCHASE",
    );
    expect(r.maxAmountPaise).toBe(2_999_999n);
    expect(typeof r.maxAmountPaise).toBe("bigint");
  });
});

describe("checkEligibility — balance guard", () => {
  it("short-circuits on an empty account whatever the form", () => {
    for (const type of ["FORM_19", "FORM_10C", "FORM_31"] as const) {
      const r = checkEligibility(type, ctx({ totalBalancePaise: 0n }), "MEDICAL");
      expect(r.eligible).toBe(false);
      expect(r.reasons).toEqual(["NO_BALANCE"]);
    }
  });
});

describe("checkAmount", () => {
  const eligible = { eligible: true, maxAmountPaise: 50_000_00n, reasons: [] as never[] };

  it("rejects zero and negative requests", () => {
    expect(checkAmount(0n, eligible)).toEqual({ ok: false, reason: "AMOUNT_INVALID" });
    expect(checkAmount(-1n, eligible)).toEqual({ ok: false, reason: "AMOUNT_INVALID" });
  });

  it("rejects a request one paise over the cap", () => {
    expect(checkAmount(50_000_01n, eligible)).toEqual({
      ok: false,
      reason: "AMOUNT_EXCEEDS_LIMIT",
    });
  });

  it("accepts a request exactly at the cap", () => {
    expect(checkAmount(50_000_00n, eligible)).toEqual({ ok: true });
  });

  it("surfaces the underlying ineligibility rather than an amount error", () => {
    const ineligible = { eligible: false, maxAmountPaise: 0n, reasons: ["STILL_EMPLOYED" as const] };
    expect(checkAmount(1_000_00n, ineligible)).toEqual({ ok: false, reason: "STILL_EMPLOYED" });
  });
});
