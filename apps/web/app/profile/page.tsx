"use client";

import Link from "next/link";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireAuth } from "~/components/site/require-auth";
import { COLOR, BADGE } from "~/design/tokens";
import { useLang } from "~/design/lang";

type Badge = keyof typeof BADGE;

/**
 * The action link on every row (Change/Add/Confirm) is real UI — matching
 * the design — but honestly inert: there is no profile-edit backend yet
 * (changing identity fields needs an employer-approval workflow, PRD §11's
 * own KYC note, not a quick form). Same treatment as "Download PDF" on the
 * Passbook page: present, visibly disabled, with a tooltip saying why,
 * rather than either hiding it or pretending it works.
 */
function InertAction({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <button
      disabled
      title={tooltip}
      style={{
        background: "none",
        border: 0,
        padding: 0,
        fontSize: 18,
        color: COLOR.muted,
        cursor: "not-allowed",
        textDecoration: "underline",
        textDecorationColor: COLOR.border,
        textUnderlineOffset: 3,
      }}
    >
      {label}
    </button>
  );
}

function Row({
  label,
  value,
  badge,
  badgeLabel,
  actionLabel,
  actionTooltip,
}: {
  label: string;
  value: string;
  badge: Badge;
  badgeLabel: string;
  actionLabel: string;
  actionTooltip: string;
}) {
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "baseline", borderBottom: `1px solid ${COLOR.border}`, padding: "20px 0", flexWrap: "wrap" }}>
      <dt style={{ flex: "0 0 200px", fontSize: 18, fontWeight: 700 }}>{label}</dt>
      <dd style={{ flex: 1, minWidth: 180, margin: 0, fontSize: 18, color: COLOR.mutedDark }}>{value}</dd>
      <dd style={{ margin: 0 }}>
        <span style={{ ...BADGE[badge], fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", padding: "6px 10px" }}>
          {badgeLabel}
        </span>
      </dd>
      <dd style={{ margin: 0 }}>
        <InertAction label={actionLabel} tooltip={actionTooltip} />
      </dd>
    </div>
  );
}

function ProfileContent() {
  const { lang } = useLang();
  const profile = trpc.member.getProfile.useQuery();

  if (profile.isLoading) {
    return <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>Loading...</main>;
  }
  if (!profile.data) {
    return (
      <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
        <p style={{ color: "#8a2321" }}>{lang === "hi" ? "जानकारी लोड नहीं हो सकी।" : "Could not load your details."}</p>
      </main>
    );
  }

  const d = profile.data;
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);
  const notAvailableTooltip = t(
    "Not available in this prototype yet",
    "अभी इस प्रोटोटाइप में उपलब्ध नहीं है",
  );
  const changeLabel = t("Change", "बदलें");

  return (
    <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <p style={{ fontSize: 17, margin: "0 0 20px" }}>
        <Link href="/dashboard">{t("Back to your account", "आपके खाते पर वापस")}</Link>
      </p>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        {t("Your details", "आपकी जानकारी")}
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.5, color: COLOR.muted, maxWidth: 640, margin: "0 0 40px" }}>
        {t(
          "Claims are paid faster when these match your bank and Aadhaar records.",
          "दावे तेज़ी से तब भुगतान होते हैं जब ये आपके बैंक और आधार रिकॉर्ड से मेल खाते हैं।",
        )}
      </p>

      <div style={{ maxWidth: 900 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: COLOR.muted, borderTop: `2px solid ${COLOR.ink}`, paddingTop: 16, margin: "0 0 4px" }}>
          {t("Identity", "पहचान")}
        </h2>
        <dl style={{ margin: "0 0 40px" }}>
          <Row
            label={t("Name", "नाम")}
            value={d.fullName}
            badge="verified"
            badgeLabel={t("Verified", "सत्यापित")}
            actionLabel={changeLabel}
            actionTooltip={notAvailableTooltip}
          />
          <Row
            label={t("Date of birth", "जन्मतिथि")}
            value={new Date(d.dateOfBirth).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" })}
            badge="verified"
            badgeLabel={t("Verified", "सत्यापित")}
            actionLabel={changeLabel}
            actionTooltip={notAvailableTooltip}
          />
          <Row
            label={t("Aadhaar", "आधार")}
            value={d.maskedAadhaar ?? t("Not linked", "लिंक नहीं है")}
            badge={d.maskedAadhaar ? "verified" : "action"}
            badgeLabel={d.maskedAadhaar ? t("Verified", "सत्यापित") : t("Action needed", "कार्रवाई आवश्यक")}
            actionLabel={changeLabel}
            actionTooltip={notAvailableTooltip}
          />
          <Row
            label="PAN"
            value={d.maskedPan ?? t("Not added", "जोड़ा नहीं गया")}
            badge={d.maskedPan ? "verified" : "action"}
            badgeLabel={d.maskedPan ? t("Verified", "सत्यापित") : t("Action needed", "कार्रवाई आवश्यक")}
            actionLabel={d.maskedPan ? changeLabel : t("Add PAN", "PAN जोड़ें")}
            actionTooltip={notAvailableTooltip}
          />
        </dl>

        <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: COLOR.muted, borderTop: `2px solid ${COLOR.ink}`, paddingTop: 16, margin: "0 0 4px" }}>
          {t("Contact and bank", "संपर्क और बैंक")}
        </h2>
        <dl style={{ margin: "0 0 40px" }}>
          <Row
            label={t("Mobile", "मोबाइल")}
            value={d.mobile}
            badge="verified"
            badgeLabel={t("Verified", "सत्यापित")}
            actionLabel={changeLabel}
            actionTooltip={notAvailableTooltip}
          />
          <Row
            label={t("Email", "ईमेल")}
            value={d.email ?? t("Not added", "जोड़ा नहीं गया")}
            badge="neutral"
            badgeLabel={t("Unconfirmed", "अपुष्ट")}
            actionLabel={t("Confirm", "पुष्टि करें")}
            actionTooltip={notAvailableTooltip}
          />
          <Row
            label={t("Bank account", "बैंक खाता")}
            value={d.bankAccountMasked ? `${d.bankAccountMasked}${d.bankIfsc ? ` · ${d.bankIfsc}` : ""}` : t("Not added", "जोड़ा नहीं गया")}
            badge={d.bankAccountMasked ? "verified" : "action"}
            badgeLabel={d.bankAccountMasked ? t("Verified", "सत्यापित") : t("Action needed", "कार्रवाई आवश्यक")}
            actionLabel={changeLabel}
            actionTooltip={notAvailableTooltip}
          />
          {d.nominees.map((n) => (
            <Row
              key={n.fullName}
              label={t("Nominee", "नामांकित व्यक्ति")}
              value={`${n.fullName}, ${n.relationship[lang]}, ${n.sharePercentage}%`}
              badge="neutral"
              badgeLabel={t(`Last set ${new Date(n.setOn).getFullYear()}`, `अंतिम बार ${new Date(n.setOn).getFullYear()} में सेट`)}
              actionLabel={changeLabel}
              actionTooltip={notAvailableTooltip}
            />
          ))}
        </dl>

        <div style={{ background: COLOR.panel, padding: "28px 32px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>
            {t("Changing your name or date of birth", "नाम या जन्मतिथि बदलना")}
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: 0 }}>
            {t(
              "These are checked against Aadhaar, and your employer has to approve the change. It usually takes 10 working days.",
              "ये आधार से जांचे जाते हैं, और आपके नियोक्ता को बदलाव मंज़ूर करना होता है। आमतौर पर 10 कार्य दिवस लगते हैं।",
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <SiteShell>
      <RequireAuth>{() => <ProfileContent />}</RequireAuth>
    </SiteShell>
  );
}
