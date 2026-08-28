"use client";

import Link from "next/link";
import { SiteShell } from "~/components/site/site-shell";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";

const SECTIONS = [
  {
    letter: "A",
    items: [
      { label: { en: "Aadhaar, link or correct", hi: "आधार, लिंक या सुधार" }, href: "/profile" },
      { label: { en: "Advance from your PF", hi: "अपने PF से अग्रिम" }, href: "/claims" },
      { label: { en: "Activate your UAN", hi: "अपना UAN सक्रिय करें" }, href: "/login" },
    ],
  },
  {
    letter: "B",
    items: [
      { label: { en: "Balance and passbook", hi: "बैलेंस और पासबुक" }, href: "/passbook" },
      { label: { en: "Bank account, add or change", hi: "बैंक खाता, जोड़ें या बदलें" }, href: "/profile" },
    ],
  },
  {
    letter: "C",
    items: [
      { label: { en: "Claim status", hi: "दावा स्थिति" }, href: "/claims/status" },
      { label: { en: "Challan and TRRN", hi: "चालान और TRRN" }, href: "/employer" },
    ],
  },
  {
    letter: "E",
    items: [{ label: { en: "ECR, monthly return", hi: "ECR, मासिक रिटर्न" }, href: "/employer" }],
  },
  {
    letter: "H",
    items: [{ label: { en: "Housing advance", hi: "आवास अग्रिम" }, href: "/claims" }],
  },
  {
    letter: "P",
    items: [
      { label: { en: "Pension payment status", hi: "पेंशन भुगतान स्थिति" }, href: "/claims/status" },
      { label: { en: "PAN, add or correct", hi: "PAN, जोड़ें या सुधार" }, href: "/profile" },
    ],
  },
  {
    letter: "W",
    items: [
      { label: { en: "Withdraw money", hi: "पैसे निकालें" }, href: "/claims" },
      { label: { en: "Wrong details in my record", hi: "मेरे रिकॉर्ड में गलत जानकारी" }, href: "/help" },
    ],
  },
] as const;

function ServicesContent() {
  const { lang } = useLang();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        {lang === "hi" ? "सभी सेवाएँ, A से Z" : "All services, A to Z"}
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.5, color: COLOR.muted, maxWidth: 620, margin: "0 0 32px" }}>
        {lang === "hi"
          ? "EPFO जो कुछ भी करता है, उसी नाम से जैसे लोग पूछते हैं।"
          : "Everything EPFO does, named the way people ask for it."}
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", borderBottom: `1px solid ${COLOR.border}`, paddingBottom: 28, margin: "0 0 8px" }}>
        {SECTIONS.map((s) => (
          <a key={s.letter} href={`#section-${s.letter}`} style={{ fontSize: 19, fontWeight: 700 }}>
            {s.letter}
          </a>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 56px", maxWidth: 920 }}>
        {SECTIONS.map((s) => (
          <div key={s.letter} id={`section-${s.letter}`}>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: "32px 0 4px" }}>{s.letter}</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {s.items.map((item) => (
                <li key={item.href + item.label.en} style={{ borderTop: `1px solid ${COLOR.border}`, padding: "16px 0", fontSize: 18 }}>
                  <Link href={item.href}>{item.label[lang]}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function ServicesPage() {
  return (
    <SiteShell>
      <ServicesContent />
    </SiteShell>
  );
}
