"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CLAIM_TYPE_INFO,
  advancePurposeLabel,
  formatINR,
  parsePaiseWire,
  type AdvancePurpose,
  type ClaimType,
} from "@repo/domain";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireAuth } from "~/components/site/require-auth";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";
import { Button } from "~/components/ui/button";

type Choice = { type: ClaimType; purpose?: AdvancePurpose };

/** Every legal (type, purpose) combination the eligibility rules actually
 *  support, in plain language. Deliberately not collapsed into fewer options
 *  than our domain model has (e.g. Form 19 and Form 10C stay separate) —
 *  each maps to a real, distinct claim in the system. */
const CHOICES: Array<{ choice: Choice; label: { en: string; hi: string }; detail: { en: string; hi: string } }> = [
  {
    choice: { type: "FORM_31", purpose: "HOUSE_PURCHASE" },
    label: { en: "Buying or building a house", hi: "मकान खरीदना या बनाना" },
    detail: { en: "Up to 90% of your own share. Form 31.", hi: "आपके हिस्से का 90% तक। फॉर्म 31।" },
  },
  {
    choice: { type: "FORM_31", purpose: "HOUSE_REPAIR" },
    label: { en: "Repairing a house", hi: "मकान की मरम्मत" },
    detail: { en: "Up to 50% of your own share, after 5 years of service. Form 31.", hi: "5 वर्ष सेवा के बाद आपके हिस्से का 50% तक। फॉर्म 31।" },
  },
  {
    choice: { type: "FORM_31", purpose: "MEDICAL" },
    label: { en: "Medical treatment", hi: "चिकित्सा उपचार" },
    detail: { en: "For you or a family member. No minimum service period. Form 31.", hi: "आपके या परिवार के लिए। न्यूनतम सेवा आवश्यक नहीं। फॉर्म 31।" },
  },
  {
    choice: { type: "FORM_31", purpose: "EDUCATION" },
    label: { en: "Education", hi: "शिक्षा" },
    detail: { en: "Up to 50% of your own share, after 7 years of service. Form 31.", hi: "7 वर्ष सेवा के बाद आपके हिस्से का 50% तक। फॉर्म 31।" },
  },
  {
    choice: { type: "FORM_31", purpose: "MARRIAGE" },
    label: { en: "Marriage", hi: "विवाह" },
    detail: { en: "Up to 50% of your own share, after 7 years of service. Form 31.", hi: "7 वर्ष सेवा के बाद आपके हिस्से का 50% तक। फॉर्म 31।" },
  },
  {
    choice: { type: "FORM_31", purpose: "UNEMPLOYMENT" },
    label: { en: "Unemployment", hi: "बेरोज़गारी" },
    detail: { en: "Up to 75% of your own share. Form 31.", hi: "आपके हिस्से का 75% तक। फॉर्म 31।" },
  },
  {
    choice: { type: "FORM_19" },
    label: { en: "I have left my job and want my full balance", hi: "मैंने नौकरी छोड़ दी है और पूरा बैलेंस चाहिए" },
    detail: { en: "Final settlement, available two months after your last working day. Form 19.", hi: "अंतिम कार्य दिवस के दो महीने बाद उपलब्ध अंतिम भुगतान। फॉर्म 19।" },
  },
  {
    choice: { type: "FORM_10C" },
    label: { en: "I have left my job and want my pension contribution", hi: "मैंने नौकरी छोड़ दी है और पेंशन अंशदान चाहिए" },
    detail: { en: "If you worked less than 10 years in total. Form 10C.", hi: "यदि आपकी कुल सेवा 10 वर्ष से कम है। फॉर्म 10C।" },
  },
];

const primaryButtonClass =
  "!bg-[#262f8c] !text-white !border-0 !border-b-[3px] !border-b-[#12174a] !rounded-none !px-7 !py-6 !text-[19px] !font-bold hover:!bg-[#1e2570] disabled:!opacity-50";
const ghostLinkClass =
  "!bg-transparent !text-[#262f8c] !underline !underline-offset-[3px] !p-0 !h-auto !font-semibold hover:!bg-transparent hover:!text-[#12174a]";

function ClaimsWizard() {
  const { lang } = useLang();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [amountRupees, setAmountRupees] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submittedClaimNumber, setSubmittedClaimNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable across retries of the same logical submit — created once when
  // the wizard starts, not regenerated on every render (PRD §16).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const choice = CHOICES[choiceIndex]!.choice;
  const utils = trpc.useUtils();

  const eligibility = trpc.claims.checkEligibility.useQuery(
    { type: choice.type, purpose: choice.purpose },
    { enabled: step >= 2 },
  );

  const submit = trpc.claims.submit.useMutation({
    onSuccess: (data) => {
      setSubmittedClaimNumber(data.claimNumber);
      setStep(4);
      setError(null);
      utils.claims.list.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  const maxAmountPaise = eligibility.data ? parsePaiseWire(eligibility.data.maxAmountPaise) : 0n;
  const amountPaise = useMemo(() => {
    const rupees = Number(amountRupees);
    if (!Number.isFinite(rupees) || rupees <= 0) return 0n;
    return BigInt(Math.round(rupees * 100));
  }, [amountRupees]);

  const stepLabels = [
    lang === "hi" ? "चरण 1 / 3 — कारण" : "Step 1 of 3 — reason",
    lang === "hi" ? "चरण 2 / 3 — राशि" : "Step 2 of 3 — amount",
    lang === "hi" ? "चरण 3 / 3 — जांच और पुष्टि" : "Step 3 of 3 — check and confirm",
    lang === "hi" ? "दावा जमा हुआ" : "Claim submitted",
  ];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <p style={{ fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase", color: COLOR.muted, fontWeight: 700, margin: "0 0 10px" }}>
        {stepLabels[step - 1]}
      </p>

      {step === 1 && (
        <div style={{ maxWidth: 680 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            {lang === "hi" ? "आपको पैसों की ज़रूरत किस लिए है?" : "What do you need the money for?"}
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: COLOR.muted, margin: "0 0 32px" }}>
            {lang === "hi" ? "हम आपके लिए सही फ़ॉर्म चुन लेंगे।" : "We will pick the right form for you. You do not need to know form numbers."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", margin: "0 0 36px" }}>
            {CHOICES.map((c, i) => (
              <label
                key={c.label.en}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  borderTop: `1px solid ${COLOR.border}`,
                  borderBottom: i === CHOICES.length - 1 ? `1px solid ${COLOR.border}` : undefined,
                  padding: "22px 0",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="claimtype"
                  checked={choiceIndex === i}
                  onChange={() => setChoiceIndex(i)}
                  style={{ width: 26, height: 26, margin: "2px 0 0", accentColor: COLOR.accent, flex: "0 0 auto" }}
                />
                <span>
                  <span style={{ display: "block", fontSize: 21, fontWeight: 700 }}>{c.label[lang]}</span>
                  <span style={{ display: "block", fontSize: 17, lineHeight: 1.5, color: COLOR.muted, marginTop: 6 }}>
                    {c.detail[lang]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <Button className={primaryButtonClass} onClick={() => setStep(2)}>
            {lang === "hi" ? "जारी रखें" : "Continue"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div style={{ maxWidth: 680 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            {lang === "hi" ? "आप कितनी राशि निकालना चाहते हैं?" : "How much do you want to withdraw?"}
          </h1>

          {eligibility.isLoading ? (
            <p style={{ color: COLOR.muted }}>{lang === "hi" ? "जांच हो रही है..." : "Checking..."}</p>
          ) : !eligibility.data?.eligible ? (
            <div style={{ background: "#f9e5c9", padding: "24px 28px", margin: "0 0 36px" }}>
              <p style={{ fontSize: 17, color: "#5c3d0a", margin: 0 }}>
                {lang === "hi"
                  ? "आप अभी इस कारण से दावा करने के योग्य नहीं हैं।"
                  : "You are not eligible to claim for this reason right now."}{" "}
                ({eligibility.data?.reasons.join(", ")})
              </p>
            </div>
          ) : (
            <>
              <div style={{ background: COLOR.panel, padding: "24px 28px", margin: "0 0 36px" }}>
                <p style={{ fontSize: 17, color: COLOR.mutedDark, margin: "0 0 6px" }}>
                  {lang === "hi" ? "आप अधिकतम कितना ले सकते हैं" : "Most you can take"}
                </p>
                <p style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
                  {formatINR(maxAmountPaise)}
                </p>
              </div>
              <label style={{ display: "block", fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>
                {lang === "hi" ? "राशि" : "Amount"}
              </label>
              <p style={{ fontSize: 16, color: COLOR.muted, margin: "0 0 10px" }}>
                {lang === "hi" ? "रुपयों में। कॉमा का उपयोग न करें।" : "In rupees. Do not use commas."}
              </p>
              <div style={{ display: "flex", alignItems: "stretch", border: `2px solid ${COLOR.ink}`, maxWidth: 340, margin: "0 0 36px" }}>
                <span style={{ background: COLOR.panel, padding: "14px 16px", fontSize: 22, fontWeight: 700, borderRight: `2px solid ${COLOR.ink}` }}>
                  ₹
                </span>
                <input
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value.replace(/[^\d]/g, ""))}
                  style={{ flex: 1, border: 0, padding: "14px 16px", fontFamily: "inherit", fontSize: 22, color: COLOR.ink, background: COLOR.white, outline: "none", minWidth: 0 }}
                />
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <Button
                  className={primaryButtonClass}
                  disabled={amountPaise <= 0n || amountPaise > maxAmountPaise}
                  onClick={() => setStep(3)}
                >
                  {lang === "hi" ? "जारी रखें" : "Continue"}
                </Button>
                <Button variant="ghost" className={ghostLinkClass} onClick={() => setStep(1)}>
                  {lang === "hi" ? "वापस" : "Back"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div style={{ maxWidth: 680 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 32px" }}>
            {lang === "hi" ? "भेजने से पहले अपना दावा जांचें" : "Check your claim before you send it"}
          </h1>
          <dl style={{ margin: "0 0 36px" }}>
            {[
              { label: lang === "hi" ? "कारण" : "Reason", value: CHOICES[choiceIndex]!.label[lang], onChange: () => setStep(1) },
              { label: lang === "hi" ? "फ़ॉर्म" : "Form", value: CLAIM_TYPE_INFO[choice.type].formName, onChange: null },
              { label: lang === "hi" ? "राशि" : "Amount", value: formatINR(amountPaise), onChange: () => setStep(2) },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", gap: 24, borderBottom: `1px solid ${COLOR.border}`, padding: "18px 0" }}>
                <dt style={{ flex: "0 0 180px", fontSize: 18, fontWeight: 700 }}>{row.label}</dt>
                <dd style={{ flex: 1, margin: 0, fontSize: 18, color: COLOR.mutedDark }}>{row.value}</dd>
                <dd style={{ margin: 0, fontSize: 18 }}>
                  {row.onChange ? (
                    <button onClick={row.onChange} style={{ background: "none", border: 0, padding: 0, color: COLOR.accent, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", fontSize: 18 }}>
                      {lang === "hi" ? "बदलें" : "Change"}
                    </button>
                  ) : (
                    <span style={{ color: COLOR.muted }}>{lang === "hi" ? "आपके लिए चुना गया" : "Chosen for you"}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div style={{ background: COLOR.panel, padding: "24px 28px", margin: "0 0 32px" }}>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: COLOR.mutedDark, margin: 0 }}>
              {lang === "hi"
                ? "आपका दावा तुरंत सुरक्षित रूप से दर्ज हो जाएगा और आपको एक दावा संख्या मिलेगी।"
                : "Your claim is recorded securely the moment you submit it, and you will get a claim number immediately."}
            </p>
          </div>
          <label style={{ display: "flex", gap: 14, alignItems: "flex-start", margin: "0 0 32px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ width: 26, height: 26, margin: "2px 0 0", accentColor: COLOR.accent, flex: "0 0 auto" }}
            />
            <span style={{ fontSize: 18, lineHeight: 1.5 }}>
              {lang === "hi"
                ? "मैं पुष्टि करता/करती हूँ कि ऊपर दी गई जानकारी सही है।"
                : "I confirm the details above are true and the money is for the reason I have given."}
            </span>
          </label>
          {error && <p style={{ fontSize: 16, color: "#8a2321", margin: "0 0 20px" }}>{error}</p>}
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              className={primaryButtonClass}
              disabled={!confirmed || submit.isPending}
              onClick={() =>
                submit.mutate({
                  type: choice.type,
                  purpose: choice.purpose,
                  amountPaise: amountPaise.toString(),
                  idempotencyKey,
                })
              }
            >
              {submit.isPending ? (lang === "hi" ? "जमा हो रहा है..." : "Submitting...") : lang === "hi" ? "दावा जमा करें" : "Submit claim"}
            </Button>
            <Button variant="ghost" className={ghostLinkClass} onClick={() => setStep(2)}>
              {lang === "hi" ? "वापस" : "Back"}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && submittedClaimNumber && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: COLOR.success, color: COLOR.white, padding: "44px 40px", margin: "0 0 36px" }}>
            <p style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>
              {lang === "hi" ? "दावा जमा हो गया" : "Claim submitted"}
            </p>
            <p style={{ fontSize: 17, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px", opacity: 0.85 }}>
              {lang === "hi" ? "संदर्भ संख्या" : "Reference number"}
            </p>
            <p style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.01em", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {submittedClaimNumber}
            </p>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 16px" }}>
            {lang === "hi" ? "आगे क्या होगा" : "What happens next"}
          </h2>
          <ol style={{ margin: "0 0 32px", padding: "0 0 0 26px", display: "flex", flexDirection: "column", gap: 14 }}>
            <li style={{ fontSize: 18, lineHeight: 1.55 }}>
              {lang === "hi" ? "आपका दावा सुरक्षित रूप से दर्ज हो चुका है।" : "Your claim is safely recorded."}
            </li>
            <li style={{ fontSize: 18, lineHeight: 1.55 }}>
              {lang === "hi" ? "एक अधिकारी आपके विवरण की जांच करेगा।" : "An officer will check your details."}
            </li>
            <li style={{ fontSize: 18, lineHeight: 1.55 }}>
              {lang === "hi" ? "सब कुछ ठीक होने पर राशि आपके खाते में भेज दी जाएगी।" : "If everything is in order, the amount is credited to your account."}
            </li>
          </ol>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link href={`/claims/status/${submittedClaimNumber}`} className={primaryButtonClass} style={{ display: "inline-block", textDecoration: "none" }}>
              {lang === "hi" ? "इस दावे को ट्रैक करें" : "Track this claim"}
            </Link>
            <Link href="/dashboard" className={ghostLinkClass} style={{ display: "inline-block" }}>
              {lang === "hi" ? "आपके खाते पर वापस" : "Back to your account"}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ClaimsPage() {
  return (
    <SiteShell>
      <RequireAuth>{() => <ClaimsWizard />}</RequireAuth>
    </SiteShell>
  );
}
