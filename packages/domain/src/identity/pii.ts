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
    } else {
      (out as Record<string, unknown>)[key] = redactValue(value);
    }
  }
  return out;
}

/**
 * Arrays are walked element by element rather than passed through. A list of
 * objects — nominees, bank accounts, past claims — is exactly the shape that
 * carries PII, and skipping arrays would have let it through untouched while
 * the function still reported success. Non-object values are returned as-is:
 * this redacts by key name, so a bare string has no key to judge it by.
 */
function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return redactPII(value as Record<string, unknown>);
  }
  return value;
}
