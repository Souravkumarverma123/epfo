"use client";

import Link from "next/link";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireAuth } from "~/components/site/require-auth";
import { COLOR, BADGE } from "~/design/tokens";
import { useLang } from "~/design/lang";

/**
 * A real EPFO UAN card shows: UAN, name, DOB, Father's/Husband's name,
 * mobile, a photo, and (often) the current employer. This project has no
 * photo storage anywhere, so rather than fabricate one, the card uses an
 * initials avatar — an honest UI convention, not a staged photo. Every
 * other field is real data, sourced the same way Profile and Dashboard
 * already source it — this page adds no new backend beyond the
 * `guardianName` column (see ADR — Father's/Husband's Name had no column
 * at all before this, so it was added for real rather than skipped, same
 * treatment as the `nominees` table).
 */

// Same one-line formatter already duplicated in site-header.tsx and
// employer/page.tsx — matching existing precedent rather than extracting a
// shared helper for a single regex.
function formatUan(uan: string): string {
  return uan.replace(/(\d{3})(?=\d)/g, "$1 ");
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function UanCardContent({ memberUan }: { memberUan: string }) {
  const { lang } = useLang();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);
  const profile = trpc.member.getProfile.useQuery();
  const summary = trpc.member.getDashboardSummary.useQuery();

  if (profile.isLoading) {
    return (
      <main id="main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        {t("Loading…", "लोड हो रहा है…")}
      </main>
    );
  }
  if (!profile.data) {
    return (
      <main id="main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        <p style={{ color: "#8a2321" }}>{t("Could not load your details.", "जानकारी लोड नहीं हो सकी।")}</p>
      </main>
    );
  }

  const d = profile.data;
  // "Current" = no exit date yet. Falls back to the first employment on
  // record so a fully-exited member's card still shows their most recent
  // employer instead of a blank field.
  const currentEmployment =
    summary.data?.employments.find((e) => e.exitedOn === null) ?? summary.data?.employments[0] ?? null;

  return (
    <main id="main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px 96px" }}>
      <div className="epfo-print-hide">
        <p style={{ fontSize: 17, margin: "0 0 20px" }}>
          <Link href="/profile">{t("Back to your details", "आपकी जानकारी पर वापस")}</Link>
        </p>
        <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
          {t("Your UAN card", "आपका UAN कार्ड")}
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.5, color: COLOR.muted, maxWidth: 640, margin: "0 0 32px" }}>
          {t(
            "Built from your real account details below — nothing on it is placeholder text. Use Download to save it as a PDF.",
            "नीचे दी गई आपकी वास्तविक खाता जानकारी से बना है — इस पर कुछ भी प्लेसहोल्डर टेक्स्ट नहीं है। इसे PDF के रूप में सहेजने के लिए डाउनलोड का उपयोग करें।",
          )}
        </p>
      </div>

      {/* The card itself — the only thing left visible when printed. */}
      <div
        style={{
          border: `3px solid ${COLOR.ink}`,
          background: COLOR.white,
          maxWidth: 640,
          margin: "0 0 28px",
        }}
      >
        <div
          style={{
            background: COLOR.accent,
            color: COLOR.white,
            padding: "14px 28px",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t("EPFO One — Universal Account Number", "ईपीएफओ वन — यूनिवर्सल अकाउंट नंबर")}
          </span>
        </div>

        <div style={{ display: "flex", gap: 24, padding: 28, flexWrap: "wrap" }}>
          <div
            aria-hidden="true"
            style={{
              width: 88,
              height: 88,
              flex: "0 0 auto",
              borderRadius: "50%",
              background: COLOR.panel,
              border: `2px solid ${COLOR.ink}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: COLOR.accent,
            }}
          >
            {initials(d.fullName)}
          </div>

          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <p style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>{d.fullName}</p>
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.04em",
                margin: "0 0 16px",
              }}
            >
              {formatUan(memberUan)}
            </p>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 8, columnGap: 16, fontSize: 15 }}>
              <dt style={{ color: COLOR.muted, fontWeight: 600 }}>{t("Date of birth", "जन्मतिथि")}</dt>
              <dd style={{ margin: 0 }}>
                {new Date(d.dateOfBirth).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </dd>

              <dt style={{ color: COLOR.muted, fontWeight: 600 }}>
                {t("Father's / Husband's name", "पिता/पति का नाम")}
              </dt>
              <dd style={{ margin: 0 }}>{d.guardianName ?? t("Not on file", "रिकॉर्ड में नहीं")}</dd>

              <dt style={{ color: COLOR.muted, fontWeight: 600 }}>{t("Mobile", "मोबाइल")}</dt>
              <dd style={{ margin: 0 }}>{d.mobile}</dd>

              <dt style={{ color: COLOR.muted, fontWeight: 600 }}>{t("Current employer", "वर्तमान नियोक्ता")}</dt>
              <dd style={{ margin: 0 }}>
                {currentEmployment?.employerName ?? t("Not currently employed", "वर्तमान में कार्यरत नहीं")}
              </dd>

              <dt style={{ color: COLOR.muted, fontWeight: 600 }}>{t("KYC status", "KYC स्थिति")}</dt>
              <dd style={{ margin: 0 }}>
                <span
                  style={{
                    ...(d.kycStatus === "VERIFIED" ? BADGE.verified : BADGE.action),
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "4px 8px",
                  }}
                >
                  {d.kycStatus === "VERIFIED" ? t("Verified", "सत्यापित") : t("Pending", "लंबित")}
                </span>
              </dd>
            </dl>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${COLOR.border}`, padding: "12px 28px", background: COLOR.panel }}>
          <p style={{ fontSize: 12, color: COLOR.muted, margin: 0 }}>
            {t(
              "Synthetic prototype data — not a real identity document, and not issued by or valid with the actual EPFO.",
              "सिंथेटिक प्रोटोटाइप डेटा — यह वास्तविक पहचान दस्तावेज़ नहीं है, और यह वास्तविक EPFO द्वारा जारी या मान्य नहीं है।",
            )}
          </p>
        </div>
      </div>

      <div className="epfo-print-hide">
        <button
          onClick={() => window.print()}
          style={{
            background: COLOR.accent,
            color: COLOR.white,
            border: 0,
            padding: "14px 28px",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("Download as PDF", "PDF के रूप में डाउनलोड करें")}
        </button>
        <p style={{ fontSize: 14, color: COLOR.muted, margin: "10px 0 0" }}>
          {t(
            'Opens your browser’s print dialog — choose "Save as PDF" as the destination.',
            'आपके ब्राउज़र का प्रिंट डायलॉग खुलेगा — गंतव्य के रूप में "PDF के रूप में सहेजें" चुनें।',
          )}
        </p>
      </div>
    </main>
  );
}

export default function UanCardPage() {
  return (
    <SiteShell>
      <RequireAuth>{(member) => <UanCardContent memberUan={member.uan} />}</RequireAuth>
    </SiteShell>
  );
}
