"use client";

/**
 * Landing page — pixel-matched to the approved design
 * ("EPFO Portal Redesign.dc.html", Home screen). Header/nav/footer now live
 * in <SiteShell> (components/site) so every screen shares them instead of
 * re-declaring the same chrome.
 */

import Link from "next/link";
import { SiteShell } from "~/components/site/site-shell";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";

const DO_IT_NOW = [
  {
    title: { en: "View your passbook", hi: "अपनी पासबुक देखें" },
    desc: {
      en: "Month-by-month contributions and interest for every job you have held.",
      hi: "आपकी हर नौकरी के लिए महीने-दर-महीने अंशदान और ब्याज।",
    },
    href: "/passbook",
  },
  {
    title: { en: "Withdraw money", hi: "पैसे निकालें" },
    desc: {
      en: "Advance for housing, illness or education, or a final settlement after leaving a job.",
      hi: "मकान, बीमारी या शिक्षा के लिए अग्रिम, या नौकरी छोड़ने के बाद अंतिम भुगतान।",
    },
    href: "/claims",
  },
  {
    title: { en: "Track a claim", hi: "दावे को ट्रैक करें" },
    desc: {
      en: "See where your claim has reached and what the office is waiting for.",
      hi: "देखें आपका दावा कहाँ पहुँचा है और कार्यालय किस चीज़ का इंतज़ार कर रहा है।",
    },
    href: "/claims/status",
  },
  {
    title: { en: "Activate your UAN", hi: "अपना UAN सक्रिय करें" },
    desc: {
      en: "First time here? Set up your account using the mobile number your employer gave us.",
      hi: "पहली बार आए हैं? अपने नियोक्ता द्वारा दिए गए मोबाइल नंबर से खाता बनाएँ।",
    },
    href: "/login",
  },
  {
    title: { en: "Update your details", hi: "अपनी जानकारी अपडेट करें" },
    desc: {
      en: "Aadhaar, PAN, bank account, name and date of birth corrections.",
      hi: "आधार, पैन, बैंक खाता, नाम और जन्मतिथि सुधार।",
    },
    href: "/profile",
  },
  {
    title: { en: "Raise a grievance", hi: "शिकायत दर्ज करें" },
    desc: {
      en: "If a claim is stuck, your employer has not paid, or a record is wrong.",
      hi: "अगर दावा अटका है, नियोक्ता ने भुगतान नहीं किया, या रिकॉर्ड गलत है।",
    },
    href: "/help",
  },
] as const;

const AUDIENCE_COLUMNS = [
  {
    title: { en: "Members", hi: "सदस्य" },
    links: [
      { label: { en: "Your account summary", hi: "आपका खाता सारांश" }, href: "/dashboard" },
      { label: { en: "Claims and withdrawals", hi: "दावे और निकासी" }, href: "/claims" },
      { label: { en: "KYC and nominations", hi: "KYC और नामांकन" }, href: "/profile" },
      { label: { en: "Transfer PF when you change jobs", hi: "नौकरी बदलने पर PF ट्रांसफर करें" }, href: "/services" },
    ],
  },
  {
    title: { en: "Pensioners", hi: "पेंशनभोगी" },
    links: [
      { label: { en: "Pension payment status", hi: "पेंशन भुगतान स्थिति" }, href: "/claims/status" },
      { label: { en: "Submit a digital life certificate", hi: "डिजिटल जीवन प्रमाण पत्र जमा करें" }, href: "/services" },
      { label: { en: "Higher pension on actual salary", hi: "वास्तविक वेतन पर उच्च पेंशन" }, href: "/services" },
      { label: { en: "Change your pension bank account", hi: "पेंशन बैंक खाता बदलें" }, href: "/services" },
    ],
  },
  {
    title: { en: "Employers", hi: "नियोक्ता" },
    links: [
      { label: { en: "File a monthly ECR", hi: "मासिक ECR दाखिल करें" }, href: "/employer" },
      { label: { en: "Pay dues and see challans", hi: "बकाया भुगतान और चालान देखें" }, href: "/employer" },
      { label: { en: "Register a new employee", hi: "नया कर्मचारी पंजीकृत करें" }, href: "/employer" },
      { label: { en: "Attest member details", hi: "सदस्य जानकारी सत्यापित करें" }, href: "/employer" },
    ],
  },
] as const;

function HomeContent() {
  const { lang } = useLang();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 40px 96px" }}>
      <h1
        style={{
          fontSize: 48,
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "0 0 20px",
          maxWidth: 780,
        }}
      >
        {lang === "hi" ? "आपका भविष्य निधि, एक ही जगह" : "Your provident fund, in one place"}
      </h1>
      <p style={{ fontSize: 21, lineHeight: 1.55, color: COLOR.muted, maxWidth: 640, margin: "0 0 36px" }}>
        {lang === "hi"
          ? "अपना बैलेंस देखें, पैसे निकालें, अपनी जानकारी अपडेट करें और दावे को ट्रैक करें। सदस्यों, पेंशनभोगियों और नियोक्ताओं के लिए।"
          : "Check your balance, withdraw money, update your details and track a claim. For members, pensioners and employers."}
      </p>

      <div style={{ border: `2px solid ${COLOR.ink}`, display: "flex", maxWidth: 640, margin: "0 0 16px" }}>
        <input
          placeholder={lang === "hi" ? "सेवाएँ, फ़ॉर्म और मार्गदर्शन खोजें" : "Search services, forms and guidance"}
          style={{
            flex: 1,
            border: 0,
            padding: "16px 18px",
            fontFamily: "inherit",
            fontSize: 19,
            color: COLOR.ink,
            background: COLOR.white,
            outline: "none",
            minWidth: 0,
          }}
        />
        <button
          style={{
            background: COLOR.ink,
            color: COLOR.white,
            border: 0,
            padding: "16px 24px",
            fontSize: 19,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {lang === "hi" ? "खोजें" : "Search"}
        </button>
      </div>
      <p style={{ fontSize: 16, color: COLOR.muted, margin: "0 0 64px" }}>
        {lang === "hi" ? "लोकप्रिय खोजें: " : "Popular searches: "}
        <Link href="/passbook">{lang === "hi" ? "पासबुक" : "passbook"}</Link>
        {", "}
        <Link href="/claims">{lang === "hi" ? "फॉर्म 31 अग्रिम" : "Form 31 advance"}</Link>
        {", "}
        <Link href="/profile">{lang === "hi" ? "आधार लिंक करें" : "link Aadhaar"}</Link>
      </p>

      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: COLOR.muted,
          borderTop: `2px solid ${COLOR.ink}`,
          paddingTop: 16,
          margin: "0 0 8px",
        }}
      >
        {lang === "hi" ? "अभी करें" : "Do it now"}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "0 48px", margin: "0 0 64px" }}>
        {DO_IT_NOW.map((item) => (
          <div key={item.href + item.title.en} style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "24px 0" }}>
            <Link href={item.href} style={{ fontSize: 22, fontWeight: 700 }}>
              {item.title[lang]}
            </Link>
            <p style={{ fontSize: 17, lineHeight: 1.5, color: COLOR.muted, margin: "8px 0 0" }}>{item.desc[lang]}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, margin: "0 0 64px" }}>
        {AUDIENCE_COLUMNS.map((col) => (
          <div key={col.title.en}>
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
              {col.title[lang]}
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {col.links.map((link) => (
                <li key={link.href + link.label.en} style={{ fontSize: 18 }}>
                  <Link href={link.href}>{link.label[lang]}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ background: COLOR.panel, borderLeft: `8px solid ${COLOR.ink}`, padding: "28px 32px", maxWidth: 760 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>
          {lang === "hi" ? "EPFO कभी भी आपका पासवर्ड या OTP नहीं माँगता" : "EPFO never asks for your password or OTP"}
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: 0 }}>
          {lang === "hi"
            ? "कोई अधिकारी दावे के बारे में कॉल करके पैसे नहीं माँगेगा। ऐसी कॉल की शिकायत 14470 पर करें।"
            : "No officer will call you about a claim or ask for money to release it. Report calls like this on 14470."}
        </p>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <SiteShell>
      <HomeContent />
    </SiteShell>
  );
}
