/**
 * Deterministic citizen-facing copy for every claim status (PRD §29, §30, §31).
 *
 * This is the reliability floor for the AI explainer layer that will sit on
 * top of it: every status has hand-written en/hi copy here. If the AI layer
 * is slow, rate-limited, or down, the UI renders these strings instead. A
 * citizen must never see a blank status because a model call failed — no
 * user-facing state may depend on an LLM succeeding.
 *
 * Strings live here, not inline in components, so adding a language is a data
 * change, not a component rewrite (PRD §31: never hardcode user-facing strings).
 */

import type { ClaimStatus } from "./status";

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export interface StatusCopy {
  label: string;
  message: string;
  action: string | null;
}

export function needsCitizenAction(status: ClaimStatus): boolean {
  return status === "ACTION_REQUIRED";
}

type CopyTable = Record<ClaimStatus, StatusCopy>;

const EN: CopyTable = {
  DRAFT: {
    label: "Draft",
    message: "Your claim is saved but not submitted yet.",
    action: "Finish and submit the form when you are ready.",
  },
  SUBMITTED: {
    label: "Submitted",
    message: "We have received your claim and it is safely recorded.",
    action: null,
  },
  VALIDATING: {
    label: "Checking details",
    message: "We are checking the details you entered.",
    action: null,
  },
  KYC_PENDING: {
    label: "Verifying identity",
    message: "We are verifying your KYC and bank details.",
    action: null,
  },
  ELIGIBILITY_CHECK: {
    label: "Checking eligibility",
    message: "We are confirming how much you can withdraw.",
    action: null,
  },
  RISK_CHECK: {
    label: "Security check",
    message: "A routine security check is running on your claim.",
    action: null,
  },
  APPROVAL_PENDING: {
    label: "Awaiting approval",
    message: "Your claim is with an EPFO officer for approval.",
    action: null,
  },
  APPROVED: {
    label: "Approved",
    message: "Your claim has been approved.",
    action: null,
  },
  PAYMENT_PENDING: {
    label: "Payment queued",
    message: "Your payment is queued to be sent to your bank.",
    action: null,
  },
  PAYMENT_PROCESSING: {
    label: "Payment sent",
    message: "Your payment has been sent to your bank.",
    action: null,
  },
  COMPLETED: {
    label: "Completed",
    message: "The money has been credited to your bank account.",
    action: null,
  },
  REJECTED: {
    label: "Rejected",
    message: "Your claim could not be approved.",
    action: "See the reason below. You can correct it and file again.",
  },
  CANCELLED: {
    label: "Cancelled",
    message: "You cancelled this claim.",
    action: null,
  },
  ACTION_REQUIRED: {
    label: "Needs your input",
    message: "We need one thing from you before we can continue.",
    action: "See the details below and update your information.",
  },
  FAILED_RETRYABLE: {
    label: "Taking longer than usual",
    message:
      "Verification is temporarily taking longer than usual. Your claim is saved and processing will continue automatically.",
    action: null,
  },
  FAILED_PERMANENT: {
    label: "Could not be completed",
    message: "We could not complete this claim automatically.",
    action: "An EPFO officer will contact you. Your money is not affected.",
  },
};

const HI: CopyTable = {
  DRAFT: {
    label: "ड्राफ़्ट",
    message: "आपका क्लेम सुरक्षित है, लेकिन अभी जमा नहीं हुआ है।",
    action: "तैयार होने पर फ़ॉर्म पूरा करके जमा करें।",
  },
  SUBMITTED: {
    label: "जमा हो गया",
    message: "हमें आपका क्लेम मिल गया है और यह सुरक्षित रूप से दर्ज है।",
    action: null,
  },
  VALIDATING: {
    label: "जानकारी जाँची जा रही है",
    message: "हम आपकी दी गई जानकारी की जाँच कर रहे हैं।",
    action: null,
  },
  KYC_PENDING: {
    label: "पहचान सत्यापन",
    message: "हम आपका KYC और बैंक विवरण सत्यापित कर रहे हैं।",
    action: null,
  },
  ELIGIBILITY_CHECK: {
    label: "पात्रता जाँच",
    message: "हम पुष्टि कर रहे हैं कि आप कितनी राशि निकाल सकते हैं।",
    action: null,
  },
  RISK_CHECK: {
    label: "सुरक्षा जाँच",
    message: "आपके क्लेम पर सामान्य सुरक्षा जाँच चल रही है।",
    action: null,
  },
  APPROVAL_PENDING: {
    label: "स्वीकृति बाकी",
    message: "आपका क्लेम स्वीकृति के लिए EPFO अधिकारी के पास है।",
    action: null,
  },
  APPROVED: {
    label: "स्वीकृत",
    message: "आपका क्लेम स्वीकृत हो गया है।",
    action: null,
  },
  PAYMENT_PENDING: {
    label: "भुगतान कतार में",
    message: "आपका भुगतान आपके बैंक को भेजे जाने के लिए कतार में है।",
    action: null,
  },
  PAYMENT_PROCESSING: {
    label: "भुगतान भेजा गया",
    message: "आपका भुगतान आपके बैंक को भेज दिया गया है।",
    action: null,
  },
  COMPLETED: {
    label: "पूरा हुआ",
    message: "राशि आपके बैंक खाते में जमा कर दी गई है।",
    action: null,
  },
  REJECTED: {
    label: "अस्वीकृत",
    message: "आपका क्लेम स्वीकृत नहीं हो सका।",
    action: "नीचे कारण देखें। आप सुधार करके दोबारा आवेदन कर सकते हैं।",
  },
  CANCELLED: {
    label: "रद्द",
    message: "आपने यह क्लेम रद्द कर दिया था।",
    action: null,
  },
  ACTION_REQUIRED: {
    label: "आपकी जानकारी चाहिए",
    message: "आगे बढ़ने से पहले हमें आपसे एक जानकारी चाहिए।",
    action: "नीचे विवरण देखें और अपनी जानकारी अपडेट करें।",
  },
  FAILED_RETRYABLE: {
    label: "सामान्य से अधिक समय",
    message:
      "सत्यापन में सामान्य से अधिक समय लग रहा है। आपका क्लेम सुरक्षित है और प्रक्रिया अपने आप जारी रहेगी।",
    action: null,
  },
  FAILED_PERMANENT: {
    label: "पूरा नहीं हो सका",
    message: "हम यह क्लेम स्वतः पूरा नहीं कर सके।",
    action: "EPFO अधिकारी आपसे संपर्क करेंगे। आपकी राशि सुरक्षित है।",
  },
};

const TABLES: Record<Locale, CopyTable> = { en: EN, hi: HI };

export function statusCopy(status: ClaimStatus, locale: Locale): StatusCopy {
  return TABLES[locale][status];
}
