import { describe, expect, it } from "vitest";
import { maskAadhaar, maskBankAccount, maskMobile, maskPan, redactPII } from "./pii";

describe("masking (PRD §24)", () => {
  it("leaves only the last four digits of an Aadhaar", () => {
    expect(maskAadhaar("234512346612")).toBe("XXXX-XXXX-6612");
  });

  it("masks an Aadhaar that arrives with separators", () => {
    expect(maskAadhaar("2345 1234 6612")).toBe("XXXX-XXXX-6612");
    expect(maskAadhaar("2345-1234-6612")).toBe("XXXX-XXXX-6612");
  });

  it("keeps a PAN's first two and last two characters only", () => {
    expect(maskPan("ABCDE1234F")).toBe("ABXXXXX4F");
    expect(maskPan("abcde1234f")).toBe("ABXXXXX4F");
  });

  it("leaves only the last four digits of a mobile number", () => {
    expect(maskMobile("+919876548821")).toBe("XXXXXX8821");
  });

  it("leaves only the last four digits of a bank account", () => {
    expect(maskBankAccount("50100234567890")).toBe("XXXXXXXX7890");
  });
});

describe("redactPII", () => {
  it("redacts by key name, case-insensitively", () => {
    const out = redactPII({ aadhaar: "234512346612", PAN: "ABCDE1234F", name: "Ananya Rao" });
    expect(out.aadhaar).toBe("[REDACTED]");
    expect(out.PAN).toBe("[REDACTED]");
    expect(out.name).toBe("Ananya Rao"); // not sensitive by this rule
  });

  it("catches the whole sensitive-key list", () => {
    const out = redactPII({
      password: "x",
      otp: "123456",
      token: "t",
      secret: "s",
      bankAccount: "50100234567890",
      ifsc: "HDFC0001234",
      dateOfBirth: "1994-03-02",
    });
    for (const value of Object.values(out)) expect(value).toBe("[REDACTED]");
  });

  it("recurses into nested objects", () => {
    const out = redactPII({ member: { kyc: { aadhaar: "234512346612" }, uan: "100234567890" } });
    const member = out.member as { kyc: { aadhaar: string }; uan: string };
    expect(member.kyc.aadhaar).toBe("[REDACTED]");
    expect(member.uan).toBe("100234567890");
  });

  it("walks arrays of objects instead of passing them through untouched", () => {
    // The audit log writes before/after snapshots through this function. A
    // list of nominees or bank accounts is exactly the shape that carries
    // PII, so an array that skipped redaction would be a silent leak into a
    // table designed to be readable by operators.
    const out = redactPII({
      nominees: [
        { name: "R Rao", aadhaar: "234512346612" },
        { name: "S Rao", aadhaar: "111122223333" },
      ],
    });
    const nominees = out.nominees as Array<{ name: string; aadhaar: string }>;
    expect(nominees[0]!.aadhaar).toBe("[REDACTED]");
    expect(nominees[1]!.aadhaar).toBe("[REDACTED]");
    expect(nominees[0]!.name).toBe("R Rao");
  });

  it("does not mutate the object it was given", () => {
    const input = { aadhaar: "234512346612" };
    const out = redactPII(input);
    expect(input.aadhaar).toBe("234512346612");
    expect(out.aadhaar).toBe("[REDACTED]");
  });

  it("leaves null and undefined alone rather than crashing", () => {
    const out = redactPII({ email: null, mobile: undefined, note: "ok" });
    expect(out.email).toBeNull();
    expect(out.note).toBe("ok");
  });
});
