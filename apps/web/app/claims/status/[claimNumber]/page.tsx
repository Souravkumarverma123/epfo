"use client";

import { use } from "react";
import Link from "next/link";
import { formatINR, parsePaiseWire, statusCopy, type ClaimStatus } from "@repo/domain";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireAuth } from "~/components/site/require-auth";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";
import { Button } from "~/components/ui/button";

/** Every non-terminal claim is polled at this cadence so the citizen sees
 *  progress (or a recovery) happen live, without reloading — the frontend
 *  half of the same PRD §14 stand-in ClaimsService.advanceIfDue drives on
 *  the backend. Stops polling once the claim reaches a terminal state. */
const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(["COMPLETED", "REJECTED", "CANCELLED", "FAILED_PERMANENT"]);

function ClaimStatusContent({ claimNumber }: { claimNumber: string }) {
  const { lang } = useLang();
  const status = trpc.claims.getStatus.useQuery(
    { claimNumber },
    {
      refetchInterval: (query) => {
        const currentStatus = query.state.data?.status;
        return currentStatus && TERMINAL_STATUSES.has(currentStatus) ? false : POLL_INTERVAL_MS;
      },
    },
  );

  if (status.isLoading) {
    return <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>Loading...</main>;
  }
  if (status.isError || !status.data) {
    return (
      <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
        <p style={{ color: "#8a2321" }}>
          {lang === "hi" ? "यह दावा नहीं मिला।" : "This claim could not be found."}
        </p>
      </main>
    );
  }

  const d = status.data;
  const currentStatus = d.status as ClaimStatus;
  const copy = statusCopy(currentStatus, lang);

  return (
    <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <p style={{ fontSize: 17, margin: "0 0 20px" }}>
        <Link href="/dashboard">{lang === "hi" ? "आपके खाते पर वापस" : "Back to your account"}</Link>
      </p>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
        {lang === "hi" ? "दावा" : "Claim"} {d.claimNumber}
      </h1>
      <p style={{ fontSize: 20, color: COLOR.muted, margin: "0 0 12px" }}>
        {formatINR(parsePaiseWire(d.amountPaise))}
        {d.submittedAt ? `, ${lang === "hi" ? "जमा किया गया" : "submitted"} ${new Date(d.submittedAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN")}` : ""}
      </p>
      {!TERMINAL_STATUSES.has(d.status) && (
        <p style={{ fontSize: 14, color: COLOR.muted, margin: "0 0 36px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLOR.accent, display: "inline-block" }} />
          {lang === "hi" ? "लाइव — यह पृष्ठ अपने आप अपडेट होता है" : "Live — this page updates on its own"}
        </p>
      )}

      <div className="two-col-layout">
        <div>
          <div style={{ border: `2px solid ${COLOR.ink}`, padding: "24px 28px", margin: "0 0 40px" }}>
            <p style={{ fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase", color: COLOR.muted, fontWeight: 700, margin: "0 0 8px" }}>
              {lang === "hi" ? "अभी यह कहाँ है" : "Where it is now"}
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 8px" }}>{copy.label}</p>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: COLOR.mutedDark, margin: 0 }}>{copy.message}</p>
            {copy.action && (
              <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: "12px 0 0", fontWeight: 600 }}>
                {copy.action}
              </p>
            )}
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 24px" }}>
            {lang === "hi" ? "प्रगति" : "Progress"}
          </h2>
          <ol style={{ listStyle: "none", margin: 0, padding: "0 0 0 32px", borderLeft: `4px solid ${COLOR.border}`, display: "flex", flexDirection: "column", gap: 32 }}>
            {d.timeline.map((step) => {
              const stepCopy = statusCopy(step.status as ClaimStatus, lang);
              const dotColor = step.state === "done" ? COLOR.success : step.state === "active" ? COLOR.accent : COLOR.bg;
              const dotBorder = step.state === "pending" ? COLOR.border : COLOR.bg;
              return (
                <li key={step.status} style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: -44,
                      top: 4,
                      width: 20,
                      height: 20,
                      background: dotColor,
                      border: `4px solid ${dotBorder}`,
                      borderRadius: "50%",
                    }}
                  />
                  <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: step.state === "pending" ? COLOR.muted : COLOR.ink }}>
                    {stepCopy.label}
                  </p>
                  <p style={{ fontSize: 17, color: COLOR.muted, margin: 0 }}>
                    {step.state === "pending" ? (lang === "hi" ? "शुरू नहीं हुआ" : "Not started") : stepCopy.message}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: COLOR.muted, borderTop: `2px solid ${COLOR.ink}`, paddingTop: 16, margin: "0 0 16px" }}>
            {lang === "hi" ? "अगर कुछ गलत है" : "If something is wrong"}
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: "0 0 20px" }}>
            {lang === "hi"
              ? "अगर दावा 20 कार्य दिवसों से आगे नहीं बढ़ा है, तो आप इसे आगे बढ़ा सकते हैं। दावा संख्या बताएँ।"
              : "If the claim has not moved for more than 20 working days, you can escalate it. Quote the claim number."}
          </p>
          <Link href="/help">
            <Button
              variant="outline"
              className="!bg-white !text-[#1a1815] !border-2 !border-[#1a1815] !rounded-none !px-6 !py-5 !text-[18px] !font-bold"
            >
              {lang === "hi" ? "शिकायत दर्ज करें" : "Raise a grievance"}
            </Button>
          </Link>

          {!TERMINAL_STATUSES.has(d.status) && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: COLOR.muted, borderTop: `2px solid ${COLOR.ink}`, paddingTop: 16, margin: "40px 0 12px" }}>
                Demo
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.5, color: COLOR.muted, margin: "0 0 12px" }}>
                Watching for a dependency failure to demo? Open the control panel in another tab.
              </p>
              <Link href="/demo/dependencies" style={{ fontSize: 16, fontWeight: 600 }}>
                Dependency controls →
              </Link>
              <p style={{ fontSize: 15, lineHeight: 1.5, color: COLOR.muted, margin: "12px 0" }}>
                Or watch the same claim from the other side of the counter.
              </p>
              <Link href="/ops" style={{ fontSize: 16, fontWeight: 600 }}>
                Operations console →
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ClaimStatusPage({ params }: { params: Promise<{ claimNumber: string }> }) {
  const { claimNumber } = use(params);
  return (
    <SiteShell>
      <RequireAuth>{() => <ClaimStatusContent claimNumber={claimNumber} />}</RequireAuth>
    </SiteShell>
  );
}
