/**
 * PII masking rules (PRD §24). Pure string functions — the decision of *what*
 * gets logged or displayed lives at the call site; this module only defines
 * *how* a value is masked once that decision is made.
 */

export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, "");
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function maskPan(pan: string): string {
  const upper = pan.toUpperCase();
  return `${upper.slice(0, 2)}XXXXX${upper.slice(-2)}`;
}

export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  return `XXXXXX${digits.slice(-4)}`;
}

export function maskBankAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  return `XXXXXXXX${digits.slice(-4)}`;
}

/**
 * Redact known-sensitive keys from an arbitrary object before it is written
 * to a log or an audit `before/after` snapshot (PRD §24: "no raw PII in
 * logs"). Deliberately conservative: an unrecognised key that looks sensitive
 * is redacted too.
 */
const SENSITIVE_KEY_PATTERN =
  /aadhaar|pan|password|otp|token|secret|bankAccount|ifsc|dateOfBirth/i;

export function redactPII<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      (out as Record<string, unknown>)[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      (out as Record<string, unknown>)[key] = redactPII(value as Record<string, unknown>);
    } else {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}
