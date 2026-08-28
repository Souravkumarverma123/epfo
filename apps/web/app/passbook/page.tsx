"use client";

import { useState } from "react";
import Link from "next/link";
import { formatINR, parsePaiseWire } from "@repo/domain";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireAuth } from "~/components/site/require-auth";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";

/** Pixel-matched to the design's Passbook screen. FY and employer filters,
 *  contribution table, running balance — all wired to member.getPassbook
 *  (PassbookService), nothing hardcoded. */
function PassbookContent({ memberUan }: { memberUan: string }) {
  const { lang } = useLang();
  const utils = trpc.useUtils();

  // Fetch once with no filter to get the default selection + option lists,
  // then let the selects drive a filtered refetch.
  const initial = trpc.member.getPassbook.useQuery({});
  const [employmentId, setEmploymentId] = useState<string | undefined>(undefined);
  const [financialYear, setFinancialYear] = useState<string | undefined>(undefined);

  const passbook = trpc.member.getPassbook.useQuery(
    { employmentId, financialYear },
    { enabled: employmentId !== undefined || financialYear !== undefined },
  );

  const data = passbook.data ?? initial.data;
  const isLoading = initial.isLoading;

  if (isLoading) {
    return <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>Loading...</main>;
  }
  if (!data) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
        <p style={{ color: "#8a2321" }}>
          {lang === "hi" ? "पासबुक लोड नहीं हो सकी।" : "Could not load your passbook."}
        </p>
      </main>
    );
  }

  const selectedEmployer =
    data.employments.find((e) => e.id === (employmentId ?? data.selectedEmploymentId)) ?? data.employments[0];

  const selectStyle: React.CSSProperties = {
    border: `2px solid ${COLOR.ink}`,
    padding: "12px 14px",
    fontFamily: "inherit",
    fontSize: 18,
    background: COLOR.white,
    color: COLOR.ink,
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <p style={{ fontSize: 17, margin: "0 0 20px" }}>
        <Link href="/dashboard">{lang === "hi" ? "आपके खाते पर वापस" : "Back to your account"}</Link>
      </p>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        {lang === "hi" ? "पासबुक" : "Passbook"}
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.5, color: COLOR.muted, maxWidth: 620, margin: "0 0 36px" }}>
        {selectedEmployer?.employerName}
        {lang === "hi" ? ". आपके नियोक्ता द्वारा दर्ज हर अंशदान और ब्याज प्रविष्टि।" : ". Every contribution and interest entry your employer has filed."}
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", borderBottom: `1px solid ${COLOR.border}`, paddingBottom: 24, margin: "0 0 8px" }}>
        <div>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>
            {lang === "hi" ? "वित्तीय वर्ष" : "Financial year"}
          </label>
          <select
            style={selectStyle}
            value={financialYear ?? data.selectedFinancialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
          >
            {data.financialYears.map((fy) => (
              <option key={fy} value={fy}>
                {fy}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>
            {lang === "hi" ? "नियोक्ता" : "Employer"}
          </label>
          <select
            style={selectStyle}
            value={employmentId ?? data.selectedEmploymentId}
            onChange={(e) => {
              setEmploymentId(e.target.value);
              setFinancialYear(undefined); // let the new employer pick its own default FY
            }}
          >
            {data.employments.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employerName}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled
          title={lang === "hi" ? "अभी उपलब्ध नहीं — केवल डेमो" : "Not available yet — demo only"}
          style={{
            background: COLOR.white,
            color: COLOR.muted,
            border: `2px solid ${COLOR.border}`,
            padding: "13px 22px",
            fontSize: 18,
            fontWeight: 700,
            cursor: "not-allowed",
          }}
        >
          {lang === "hi" ? "PDF डाउनलोड करें" : "Download PDF"}
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 640, fontSize: 17, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                lang === "hi" ? "महीना" : "Month",
                lang === "hi" ? "आपका हिस्सा" : "Your share",
                lang === "hi" ? "नियोक्ता हिस्सा" : "Employer share",
                lang === "hi" ? "पेंशन (EPS)" : "Pension (EPS)",
                lang === "hi" ? "बैलेंस" : "Balance",
              ].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 ? "left" : "right",
                    fontSize: 15,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COLOR.muted,
                    borderBottom: `2px solid ${COLOR.ink}`,
                    padding: i === 0 ? "16px 16px 12px 0" : "16px 16px 12px 0",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "24px 0", color: COLOR.muted }}>
                  {lang === "hi" ? "इस वर्ष कोई प्रविष्टि नहीं।" : "No entries for this year."}
                </td>
              </tr>
            )}
            {data.rows.map((row, i) => {
              const isInterest = row.type === "INTEREST";
              return (
                <tr key={i}>
                  <td
                    style={{
                      borderBottom: `1px solid ${COLOR.borderLight}`,
                      padding: "16px 16px 16px 0",
                      fontWeight: 700,
                      background: isInterest ? COLOR.panel : undefined,
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      borderBottom: `1px solid ${COLOR.borderLight}`,
                      padding: "16px 16px 16px 0",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: isInterest ? COLOR.muted : undefined,
                      background: isInterest ? COLOR.panel : undefined,
                    }}
                  >
                    {isInterest ? "—" : formatINR(parsePaiseWire(row.employeeSharePaise))}
                  </td>
                  <td
                    style={{
                      borderBottom: `1px solid ${COLOR.borderLight}`,
                      padding: "16px 16px 16px 0",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: isInterest ? COLOR.muted : undefined,
                      background: isInterest ? COLOR.panel : undefined,
                    }}
                  >
                    {isInterest ? "—" : formatINR(parsePaiseWire(row.employerSharePaise))}
                  </td>
                  <td
                    style={{
                      borderBottom: `1px solid ${COLOR.borderLight}`,
                      padding: "16px 16px 16px 0",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: isInterest ? COLOR.muted : undefined,
                      background: isInterest ? COLOR.panel : undefined,
                    }}
                  >
                    {isInterest ? "—" : formatINR(parsePaiseWire(row.pensionSharePaise))}
                  </td>
                  <td
                    style={{
                      borderBottom: `1px solid ${COLOR.borderLight}`,
                      padding: "16px 0",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      background: isInterest ? COLOR.panel : undefined,
                    }}
                  >
                    {formatINR(parsePaiseWire(row.balanceAfterPaise))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 17, color: COLOR.muted, margin: "24px 0 0" }}>
        {lang === "hi" ? (
          <>
            नियोक्ता द्वारा मासिक रिटर्न दाखिल करने पर अंशदान यहाँ दिखता है। यदि कोई महीना छूट गया है, तो{" "}
            <Link href="/help">हमें बताएँ</Link>।
          </>
        ) : (
          <>
            Contributions appear here once your employer files the monthly return. If a month is missing,{" "}
            <Link href="/help">tell us about it</Link>.
          </>
        )}
      </p>
    </main>
  );
}

export default function PassbookPage() {
  return (
    <SiteShell>
      <RequireAuth>{(member) => <PassbookContent memberUan={member.uan} />}</RequireAuth>
    </SiteShell>
  );
}
