/**
 * Claim types and eligibility rules (PRD §11, §13).
 *
 * SYNTHETIC AND SIMPLIFIED. Modelled on the shape of real EPFO forms so the
 * prototype behaves plausibly, but these are not the statutory rules — see
 * docs/HONESTY.md.
 *
 * Architectural boundary that matters for this project: the AI layer may
 * SUGGEST which form fits a citizen's situation. Only the pure functions in
 * this file DECIDE eligibility and amounts. A model is never in the
 * financial decision path (PRD §4).
 */

import type { Paise } from "../money";

export const CLAIM_TYPES = ["FORM_19", "FORM_10C", "FORM_31"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const ADVANCE_PURPOSES = [
  "MEDICAL",
  "EDUCATION",
  "MARRIAGE",
  "HOUSE_PURCHASE",
  "HOUSE_REPAIR",
  "UNEMPLOYMENT",
] as const;
export type AdvancePurpose = (typeof ADVANCE_PURPOSES)[number];

export interface ClaimTypeInfo {
  code: ClaimType;
  plainName: { en: string; hi: string };
  formName: string;
  summary: { en: string; hi: string };
  requiresExit: boolean;
}

export const CLAIM_TYPE_INFO: Record<ClaimType, ClaimTypeInfo> = {
  FORM_19: {
    code: "FORM_19",
    formName: "Form 19",
    plainName: { en: "Withdraw my full PF balance", hi: "मेरा पूरा PF बैलेंस निकालें" },
    summary: {
      en: "Final settlement of your PF account after you have left a job and stayed unemployed for two months.",
      hi: "नौकरी छोड़ने और दो महीने बेरोज़गार रहने के बाद आपके PF खाते का अंतिम भुगतान।",
    },
    requiresExit: true,
  },
  FORM_10C: {
    code: "FORM_10C",
    formName: "Form 10C",
    plainName: { en: "Withdraw my pension contribution", hi: "मेरा पेंशन अंशदान निकालें" },
    summary: {
      en: "Withdraw your EPS pension amount if you worked for less than ten years in total.",
      hi: "यदि आपकी कुल सेवा दस वर्ष से कम है तो अपनी EPS पेंशन राशि निकालें।",
    },
    requiresExit: true,
  },
  FORM_31: {
    code: "FORM_31",
    formName: "Form 31",
    plainName: { en: "Take an advance while still employed", hi: "नौकरी करते हुए अग्रिम राशि लें" },
    summary: {
      en: "Withdraw part of your PF for a specific need such as medical treatment, education, marriage or housing, while you are still working.",
      hi: "नौकरी करते हुए इलाज, शिक्षा, विवाह या मकान जैसी ज़रूरत के लिए अपने PF का कुछ हिस्सा निकालें।",
    },
    requiresExit: false,
  },
};

interface AdvanceRule {
  minServiceYears: number;
  /** Fraction of the member's own (employee) share that may be withdrawn. */
  maxEmployeeShareFraction: number;
  label: { en: string; hi: string };
}

const ADVANCE_RULES: Record<AdvancePurpose, AdvanceRule> = {
  MEDICAL: { minServiceYears: 0, maxEmployeeShareFraction: 1, label: { en: "Medical treatment", hi: "चिकित्सा उपचार" } },
  EDUCATION: { minServiceYears: 7, maxEmployeeShareFraction: 0.5, label: { en: "Education", hi: "शिक्षा" } },
  MARRIAGE: { minServiceYears: 7, maxEmployeeShareFraction: 0.5, label: { en: "Marriage", hi: "विवाह" } },
  HOUSE_PURCHASE: { minServiceYears: 5, maxEmployeeShareFraction: 0.9, label: { en: "Buying or building a house", hi: "मकान खरीदना या बनाना" } },
  HOUSE_REPAIR: { minServiceYears: 5, maxEmployeeShareFraction: 0.5, label: { en: "Repairing a house", hi: "मकान की मरम्मत" } },
  UNEMPLOYMENT: { minServiceYears: 0, maxEmployeeShareFraction: 0.75, label: { en: "Unemployment", hi: "बेरोज़गारी" } },
};

export function advancePurposeLabel(purpose: AdvancePurpose) {
  return ADVANCE_RULES[purpose].label;
}

/** Everything the eligibility rules need to know about a member. */
export interface EligibilityContext {
  totalBalancePaise: Paise;
  employeeSharePaise: Paise;
  serviceYears: number;
  hasExited: boolean;
  monthsSinceExit: number;
}

export type IneligibilityCode =
  | "STILL_EMPLOYED"
  | "WAITING_PERIOD"
  | "INSUFFICIENT_SERVICE"
  | "SERVICE_TOO_LONG"
  | "PURPOSE_REQUIRED"
  | "NO_BALANCE"
  | "AMOUNT_EXCEEDS_LIMIT"
  | "AMOUNT_INVALID";

export interface EligibilityResult {
  eligible: boolean;
  maxAmountPaise: Paise;
  reasons: IneligibilityCode[];
}

/**
 * Decide whether a member may file a given claim type, and for how much.
 * Pure and deterministic — same inputs, same answer, always — which is what
 * lets us reconcile and audit it later (PRD §12, §34).
 */
export function checkEligibility(
  type: ClaimType,
  ctx: EligibilityContext,
  purpose?: AdvancePurpose,
): EligibilityResult {
  const reasons: IneligibilityCode[] = [];

  if (ctx.totalBalancePaise <= 0n) {
    return { eligible: false, maxAmountPaise: 0n, reasons: ["NO_BALANCE"] };
  }

  switch (type) {
    case "FORM_19": {
      if (!ctx.hasExited) reasons.push("STILL_EMPLOYED");
      else if (ctx.monthsSinceExit < 2) reasons.push("WAITING_PERIOD");
      return reasons.length > 0
        ? { eligible: false, maxAmountPaise: 0n, reasons }
        : { eligible: true, maxAmountPaise: ctx.totalBalancePaise, reasons };
    }

    case "FORM_10C": {
      if (!ctx.hasExited) reasons.push("STILL_EMPLOYED");
      // Ten or more years earns a pension (Form 10D) rather than a
      // withdrawal, so 10C stops being the right form.
      if (ctx.serviceYears >= 10) reasons.push("SERVICE_TOO_LONG");
      return reasons.length > 0
        ? { eligible: false, maxAmountPaise: 0n, reasons }
        : {
            eligible: true,
            // Synthetic: EPS share modelled as a flat portion of the balance.
            maxAmountPaise: ctx.totalBalancePaise / 10n,
            reasons,
          };
    }

    case "FORM_31": {
      if (!purpose) {
        return { eligible: false, maxAmountPaise: 0n, reasons: ["PURPOSE_REQUIRED"] };
      }
      const rule = ADVANCE_RULES[purpose];
      if (ctx.serviceYears < rule.minServiceYears) reasons.push("INSUFFICIENT_SERVICE");
      if (reasons.length > 0) return { eligible: false, maxAmountPaise: 0n, reasons };

      // Percent maths in integer paise: multiply first, then divide.
      const numerator = BigInt(Math.round(rule.maxEmployeeShareFraction * 1000));
      const cap = (ctx.employeeSharePaise * numerator) / 1000n;
      return { eligible: true, maxAmountPaise: cap, reasons };
    }
  }
}

export function checkAmount(
  requestedPaise: Paise,
  eligibility: EligibilityResult,
): { ok: boolean; reason?: IneligibilityCode } {
  if (requestedPaise <= 0n) return { ok: false, reason: "AMOUNT_INVALID" };
  if (!eligibility.eligible) return { ok: false, reason: eligibility.reasons[0] };
  if (requestedPaise > eligibility.maxAmountPaise) {
    return { ok: false, reason: "AMOUNT_EXCEEDS_LIMIT" };
  }
  return { ok: true };
}
