"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";
import { Button } from "~/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";

/**
 * Mock login (PRD §6). Two steps: UAN -> request an OTP, then OTP -> a
 * session. Laid out like the design's own login screen (a form column next
 * to an explainer panel, 2px black borders, Public Sans) — but the form
 * itself is the real OTP flow, not the design's password field, since there
 * is no password subsystem (deliberate: PRD §6 wants mock identity, not a
 * fake credential store). shadcn's Button/InputOTP are kept per request, but
 * restyled to the site's palette instead of their default dark theme.
 */
function LoginContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { lang } = useLang();
  const [step, setStep] = useState<"uan" | "otp">("uan");
  const [uan, setUan] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = trpc.auth.requestOtp.useMutation({
    onSuccess: (data) => {
      setDevOtp(data.devOtp);
      setStep("otp");
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: (member) => {
      utils.auth.me.setData(undefined, { member });
      router.push("/dashboard");
    },
    onError: (err) => setError(err.message),
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: `2px solid ${COLOR.ink}`,
    padding: "14px 16px",
    fontFamily: "inherit",
    fontSize: 20,
    color: COLOR.ink,
    background: COLOR.white,
    outline: "none",
  };

  const primaryButtonClass =
    "!bg-[#262f8c] !text-white !border-0 !border-b-[3px] !border-b-[#12174a] !rounded-none !px-7 !py-6 !text-[19px] !font-bold hover:!bg-[#1e2570]";
  const ghostLinkClass =
    "!bg-transparent !text-[#262f8c] !underline !underline-offset-[3px] !p-0 !h-auto !font-semibold hover:!bg-transparent hover:!text-[#12174a]";

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 72,
          alignItems: "start",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 24px" }}>
            {lang === "hi" ? "अपने EPF खाते में साइन इन करें" : "Sign in to your EPF account"}
          </h1>

          {step === "uan" ? (
            <>
              <label style={{ display: "block", fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
                {lang === "hi" ? "यूनिवर्सल अकाउंट नंबर (UAN)" : "Universal Account Number (UAN)"}
              </label>
              <p style={{ fontSize: 16, color: COLOR.muted, margin: "0 0 8px" }}>
                {lang === "hi" ? "12 अंक। यह आपकी पेस्लिप पर है।" : "12 digits. It is on your payslip."}
              </p>
              <input
                value={uan}
                onChange={(e) => setUan(e.target.value)}
                placeholder="100 234 567 890"
                style={{ ...inputStyle, margin: "0 0 24px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && uan.trim()) requestOtp.mutate({ uan });
                }}
              />
              {error && (
                <p style={{ fontSize: 16, color: "#8a2321", margin: "0 0 20px" }}>{error}</p>
              )}
              <Button
                className={primaryButtonClass}
                disabled={!uan.trim() || requestOtp.isPending}
                onClick={() => requestOtp.mutate({ uan })}
              >
                {requestOtp.isPending
                  ? lang === "hi"
                    ? "भेजा जा रहा है..."
                    : "Sending..."
                  : lang === "hi"
                    ? "कोड भेजें"
                    : "Send code"}
              </Button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 18, color: COLOR.mutedDark, margin: "0 0 6px" }}>
                {lang === "hi"
                  ? `UAN ${uan} के लिए भेजा गया 6 अंकों का कोड दर्ज करें।`
                  : `Enter the 6-digit code sent for UAN ${uan}.`}
              </p>
              <label style={{ display: "block", fontSize: 18, fontWeight: 700, margin: "20px 0 10px" }}>
                {lang === "hi" ? "वन-टाइम कोड" : "One-time code"}
              </label>
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="!h-14 !w-12 !rounded-none !border-2 !border-[#1a1815] !text-xl !bg-white !text-[#1a1815] first:!rounded-none last:!rounded-none data-[active=true]:!border-[#262f8c] data-[active=true]:!ring-0"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {devOtp && (
                <p style={{ fontSize: 16, color: COLOR.muted, margin: "16px 0 0" }}>
                  {lang === "hi"
                    ? "डेमो मोड — कोई SMS नहीं भेजा जाता। आपका कोड है "
                    : "Demo mode — no SMS is sent. Your code is "}
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: COLOR.ink }}>{devOtp}</span>.
                </p>
              )}
              {error && (
                <p style={{ fontSize: 16, color: "#8a2321", margin: "16px 0 0" }}>{error}</p>
              )}
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 28 }}>
                <Button
                  className={primaryButtonClass}
                  disabled={code.length !== 6 || verifyOtp.isPending}
                  onClick={() => verifyOtp.mutate({ uan, code })}
                >
                  {verifyOtp.isPending
                    ? lang === "hi"
                      ? "सत्यापित हो रहा है..."
                      : "Verifying..."
                    : lang === "hi"
                      ? "साइन इन करें"
                      : "Sign in"}
                </Button>
                <Button
                  variant="ghost"
                  className={ghostLinkClass}
                  onClick={() => {
                    setStep("uan");
                    setCode("");
                    setError(null);
                  }}
                >
                  {lang === "hi" ? "अलग UAN का उपयोग करें" : "Use a different UAN"}
                </Button>
              </div>
            </>
          )}
        </div>

        <div style={{ background: COLOR.panel, padding: 32, maxWidth: 460 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 12px" }}>
            {lang === "hi" ? "यह कैसे काम करता है" : "How this works"}
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: "0 0 24px" }}>
            {lang === "hi"
              ? "कोई पासवर्ड नहीं। हम आपके UAN के लिए एक बार का कोड भेजते हैं — डेमो में यह स्क्रीन पर दिखाया जाता है क्योंकि अभी कोई वास्तविक SMS सेवा जुड़ी नहीं है।"
              : "No password. We send a one-time code for your UAN — in this demo it's shown on screen because there's no real SMS gateway connected yet."}
          </p>
          <ol style={{ listStyle: "none", counterReset: "s", margin: "0 0 28px", padding: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              lang === "hi"
                ? "अपना UAN दर्ज करें (परीक्षण के लिए 100234567890 आज़माएँ)।"
                : "Enter your UAN (try 100234567890 for testing).",
              lang === "hi" ? "स्क्रीन पर दिखाए गए 6-अंकीय कोड की पुष्टि करें।" : "Confirm the 6-digit code shown on screen.",
              lang === "hi" ? "आप तुरंत साइन इन हो जाते हैं।" : "You are signed in immediately.",
            ].map((text, i) => (
              <li key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span
                  style={{
                    flex: "0 0 34px",
                    height: 34,
                    background: COLOR.ink,
                    color: COLOR.white,
                    fontSize: 17,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 17, lineHeight: 1.5 }}>{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <SiteShell>
      <LoginContent />
    </SiteShell>
  );
}
