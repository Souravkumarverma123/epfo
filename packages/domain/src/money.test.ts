import { describe, expect, it } from "vitest";
import { formatINR, paiseToWire, parsePaiseWire, rupeesToPaise } from "./money";

describe("rupeesToPaise", () => {
  it("converts whole rupees exactly", () => {
    expect(rupeesToPaise(50_000)).toBe(5_000_000n);
    expect(rupeesToPaise(0)).toBe(0n);
  });

  it("rounds at the paise boundary instead of inheriting float error", () => {
    // 0.1 + 0.2 is 0.30000000000000004 in IEEE-754. Multiplied by 100 that
    // is 30.000000000000004 — truncating would give 30, but a different
    // float path could give 29. Rounding at the boundary pins it.
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30n);
  });

  it("still cannot rescue a rupee value that was already lossy as a float", () => {
    // Documenting a real limit, not asserting a wish. 1.005 has no exact
    // IEEE-754 representation: the nearest double is 1.00499999999999989…,
    // so by the time this function sees it, the third decimal is already
    // gone and it rounds to 100 paise rather than 101.
    //
    // This is why every amount inside the system is a bigint of paise and
    // `rupeesToPaise` is only ever called at the UI edge on values a human
    // typed in whole rupees. It is not safe as a general money parser.
    expect(rupeesToPaise(1.005)).toBe(100n);
  });

  it("refuses non-finite input rather than producing a silent zero", () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow();
    expect(() => rupeesToPaise(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("formatINR — Indian digit grouping", () => {
  it("groups lakhs and crores the Indian way, not the western way", () => {
    expect(formatINR(100_000_000n)).toBe("₹10,00,000.00"); // 10 lakh
    expect(formatINR(1_000_000_000n)).toBe("₹1,00,00,000.00"); // 1 crore
  });

  it("formats small amounts without a separator", () => {
    expect(formatINR(0n)).toBe("₹0.00");
    expect(formatINR(50n)).toBe("₹0.50");
    expect(formatINR(99_900n)).toBe("₹999.00");
  });

  it("always shows two paise digits", () => {
    expect(formatINR(100_005n)).toBe("₹1,000.05");
    expect(formatINR(5_000_000n)).toBe("₹50,000.00");
  });

  it("puts the sign outside the rupee symbol for negatives", () => {
    expect(formatINR(-5_000_000n)).toBe("-₹50,000.00");
    expect(formatINR(-50n)).toBe("-₹0.50");
  });
});

describe("wire format", () => {
  it("round-trips through a decimal string", () => {
    for (const value of [0n, 1n, 5_000_000n, -5_000_000n, 9_007_199_254_740_993n]) {
      expect(parsePaiseWire(paiseToWire(value))).toBe(value);
    }
  });

  it("survives an amount beyond Number.MAX_SAFE_INTEGER", () => {
    // The reason the wire format is a string and not a JSON number.
    const huge = 9_007_199_254_740_993n; // MAX_SAFE_INTEGER + 2
    expect(parsePaiseWire(paiseToWire(huge))).toBe(huge);
    // The same value routed through a JSON number instead comes back wrong:
    // 9007199254740993 is not representable as a double and collapses to
    // ...992. That silent single-paise loss is the whole argument for the
    // string wire format.
    expect(BigInt(Number(paiseToWire(huge)))).not.toBe(huge);
    expect(BigInt(Number(paiseToWire(huge)))).toBe(9_007_199_254_740_992n);
  });

  it("rejects anything that is not an integer paise string", () => {
    for (const bad of ["", "1.5", "abc", "1e5", " 100", "100 "]) {
      expect(() => parsePaiseWire(bad), `should reject ${JSON.stringify(bad)}`).toThrow();
    }
  });
});
