"use client";

import Link from "next/link";
import { formatINR, parsePaiseWire } from "@repo/domain";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireAuth } from "~/components/site/require-auth";
import { COLOR, BADGE } from "~/design/tokens";
import { useLang } from "~/design/lang";

/** Pixel-matched to the design's Dashboard screen, wired to real data via
 *  member.getDashboardSummary (MemberService). The stat tiles, employment
 *  table and task list are all real — nothing here is a hardcoded number. */
function DashboardContent({ fullName }: { fullName: string }) {
  const { lang } = useLang();
  const summary = trpc.member.getDashboardSummary.useQuery();

  if (summary.isLoading) {
    return <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>Loading...</main>;
  }
  if (summary.isError || !summary.data) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
        <p style={{ color: "#8a2321" }}>Could not load your dashboard. Please try again.</p>
      </main>
    );
  }

  const d = summary.data;
  const balance = formatINR(parsePaiseWire(d.totalBalancePaise));
  const lastContribution = d.lastContribution ? formatINR(parsePaiseWire(d.lastContribution.amountPaise)) : null;
  const interest = d.latestInterestCredit ? formatINR(parsePaiseWire(d.latestInterestCredit.amountPaise)) : null;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <p style={{ fontSize: 17, color: COLOR.muted, margin: "0 0 8px" }}>
        {lang === "hi" ? "इस रूप में साइन इन" : "Signed in as"}
      </p>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 40px" }}>
        {fullName}
      </h1>

      <div
        style={{
          borderTop: `2px solid ${COLOR.ink}`,
          padding: "28px 0 32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 40,
          borderBottom: `1px solid ${COLOR.border}`,
          margin: "0 0 40px",
        }}
      >
        <div>
          <p style={{ fontSize: 16, color: COLOR.muted, margin: "0 0 6px" }}>
            {lang === "hi" ? "कुल बैलेंस" : "Total balance"}
          </p>
          <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>{balance}</p>
        </div>
        <div>
          <p style={{ fontSize: 16, color: COLOR.muted, margin: "0 0 6px" }}>
            {lang === "hi" ? "अंतिम अंशदान" : "Last contribution"}
          </p>
          <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            {lastContribution ?? "—"}
          </p>
          <p style={{ fontSize: 16, color: COLOR.muted, margin: 0 }}>
            {d.lastContribution
              ? `${d.lastContribution.month}, ${
                  d.lastContribution.onTime
                    ? lang === "hi"
                      ? "समय पर प्राप्त"
                      : "received on time"
                    : lang === "hi"
                      ? "देर से प्राप्त"
                      : "received late"
                }`
              : lang === "hi"
                ? "अभी तक कोई अंशदान नहीं"
                : "No contributions yet"}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 16, color: COLOR.muted, margin: "0 0 6px" }}>
            {lang === "hi" ? "जमा ब्याज" : "Interest credited"}
          </p>
          <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            {interest ?? "—"}
          </p>
        </div>
      </div>

      <div className="two-col-layout">
        <div>
          {d.tasks.length > 0 && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 4px" }}>
                {lang === "hi" ? "आपके ध्यान की ज़रूरत है" : "Things that need you"}
              </h2>
              <p style={{ fontSize: 17, color: COLOR.muted, margin: "0 0 20px" }}>
                {d.tasks.length === 1
                  ? lang === "hi"
                    ? "एक चीज़ बाकी है।"
                    : "One item is waiting."
                  : lang === "hi"
                    ? `${d.tasks.length} चीज़ें बाकी हैं।`
                    : `${d.tasks.length} items are waiting.`}
              </p>
              <ul style={{ listStyle: "none", margin: "0 0 48px", padding: 0 }}>
                {d.tasks.map((task, i) => {
                  const badge = task.severity === "action" ? BADGE.action : BADGE.neutral;
                  const href = task.code === "ADD_PAN" ? "/profile" : "#";
                  return (
                    <li
                      key={task.code}
                      style={{
                        borderTop: `1px solid ${COLOR.border}`,
                        borderBottom: i === d.tasks.length - 1 ? `1px solid ${COLOR.border}` : undefined,
                        padding: "20px 0",
                        display: "flex",
                        gap: 20,
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ maxWidth: 440 }}>
                        <Link href={href} style={{ fontSize: 20, fontWeight: 700 }}>
                          {task.title[lang]}
                        </Link>
                        <span style={{ display: "block", fontSize: 17, lineHeight: 1.5, color: COLOR.muted, marginTop: 6 }}>
                          {task.description[lang]}
                        </span>
                      </span>
                      <span
                        style={{
                          ...badge,
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          padding: "6px 10px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.severity === "action"
                          ? lang === "hi"
                            ? "कार्रवाई आवश्यक"
                            : "Action needed"
                          : lang === "hi"
                            ? "वैकल्पिक"
                            : "Optional"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 20px" }}>
            {lang === "hi" ? "आपका रोज़गार रिकॉर्ड" : "Your employment record"}
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 520, fontSize: 17, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    lang === "hi" ? "नियोक्ता" : "Employer",
                    lang === "hi" ? "अवधि" : "Period",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        fontSize: 15,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: COLOR.muted,
                        borderBottom: `2px solid ${COLOR.ink}`,
                        padding: "0 16px 10px 0",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: "right",
                      fontSize: 15,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: COLOR.muted,
                      borderBottom: `2px solid ${COLOR.ink}`,
                      padding: "0 0 10px 0",
                    }}
                  >
                    {lang === "hi" ? "योगदान" : "Contributed"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.employments.map((e) => (
                  <tr key={e.employerName + e.joinedOn}>
                    <td style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "18px 16px 18px 0", fontWeight: 700 }}>
                      {e.employerName}
                    </td>
                    <td style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "18px 16px 18px 0", color: COLOR.muted }}>
                      {e.joinedOn} {lang === "hi" ? "से" : "to"} {e.exitedOn ?? (lang === "hi" ? "अब तक" : "now")}
                    </td>
                    <td
                      style={{
                        borderBottom: `1px solid ${COLOR.border}`,
                        padding: "18px 0",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatINR(parsePaiseWire(e.contributedPaise))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 17, margin: "20px 0 0" }}>
            <Link href="/passbook">{lang === "hi" ? "पूरी पासबुक देखें" : "See full passbook"}</Link>
          </p>
        </div>

        <div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: COLOR.muted,
              borderTop: `2px solid ${COLOR.ink}`,
              paddingTop: 16,
              margin: "0 0 20px",
            }}
          >
            {lang === "hi" ? "एक कार्य शुरू करें" : "Start a task"}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start", margin: "0 0 40px" }}>
            <Link
              href="/claims"
              style={{
                background: COLOR.accent,
                color: COLOR.white,
                borderBottom: `3px solid ${COLOR.accentDark}`,
                padding: "15px 24px",
                fontSize: 18,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {lang === "hi" ? "पैसे निकालें" : "Withdraw money"}
            </Link>
            <Link
              href="/passbook"
              style={{
                background: COLOR.white,
                color: COLOR.ink,
                border: `2px solid ${COLOR.ink}`,
                padding: "13px 22px",
                fontSize: 18,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {lang === "hi" ? "पासबुक डाउनलोड करें" : "Download passbook"}
            </Link>
            <Link
              href="/help"
              style={{
                background: COLOR.white,
                color: COLOR.ink,
                border: `2px solid ${COLOR.ink}`,
                padding: "13px 22px",
                fontSize: 18,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {lang === "hi" ? "शिकायत दर्ज करें" : "Raise a grievance"}
            </Link>
          </div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: COLOR.muted,
              borderTop: `2px solid ${COLOR.ink}`,
              paddingTop: 16,
              margin: "0 0 16px",
            }}
          >
            {lang === "hi" ? "पेंशन (EPS)" : "Pension (EPS)"}
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: "0 0 12px" }}>
            {lang === "hi"
              ? `आपकी ${d.pensionServiceYears} वर्ष और ${d.pensionServiceMonths} महीने की पेंशन योग्य सेवा है। आप 58 वर्ष की आयु में मासिक पेंशन के पात्र होंगे।`
              : `You have ${d.pensionServiceYears} years and ${d.pensionServiceMonths} months of pensionable service. You become eligible for a monthly pension at 58.`}
          </p>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <SiteShell>
      <RequireAuth>{(member) => <DashboardContent fullName={member.fullName} />}</RequireAuth>
    </SiteShell>
  );
}
