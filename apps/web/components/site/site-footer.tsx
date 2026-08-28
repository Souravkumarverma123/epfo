"use client";

import Link from "next/link";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";

interface FooterLinkItem {
  label: { en: string; hi: string };
  /** null = not built in this prototype (rendered inert via FooterLink
   *  below). Nothing currently uses null — every link here is real — but
   *  the type is kept so a future addition can honestly opt out of it. */
  href: string | null;
}
interface FooterColumn {
  title: { en: string; hi: string };
  links: FooterLinkItem[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: { en: "Services", hi: "सेवाएँ" },
    links: [
      { label: { en: "All services A to Z", hi: "सभी सेवाएँ" }, href: "/services" },
      { label: { en: "For employers", hi: "नियोक्ता के लिए" }, href: "/employer" },
      { label: { en: "Help and grievances", hi: "सहायता और शिकायतें" }, href: "/help" },
    ],
  },
  {
    title: { en: "About", hi: "परिचय" },
    links: [
      { label: { en: "What EPFO does", hi: "EPFO क्या करता है" }, href: "/about" },
      { label: { en: "Acts, schemes and circulars", hi: "अधिनियम, योजनाएँ और परिपत्र" }, href: "/schemes" },
      { label: { en: "Right to Information", hi: "सूचना का अधिकार" }, href: "/rti" },
    ],
  },
  {
    title: { en: "This site", hi: "यह साइट" },
    links: [
      { label: { en: "Accessibility statement", hi: "सुगम्यता विवरण" }, href: "/accessibility" },
      { label: { en: "Privacy", hi: "गोपनीयता" }, href: "/privacy" },
      { label: { en: "Give feedback on this page", hi: "इस पेज पर प्रतिक्रिया दें" }, href: "/feedback" },
    ],
  },
];

function FooterLink({ href, label }: { href: string | null; label: string }) {
  if (href) return <Link href={href}>{label}</Link>;
  return (
    <span
      title="Not available in this prototype yet"
      style={{
        color: COLOR.muted,
        cursor: "not-allowed",
        textDecoration: "underline",
        textDecorationColor: COLOR.border,
        textUnderlineOffset: 3,
      }}
    >
      {label}
    </span>
  );
}

export function SiteFooter() {
  const { lang } = useLang();

  return (
    <footer style={{ background: COLOR.panel, borderTop: `4px solid ${COLOR.ink}` }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "48px 40px 64px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 40,
        }}
      >
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title.en}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: COLOR.muted,
                margin: "0 0 14px",
              }}
            >
              {col.title[lang]}
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {col.links.map((link) => (
                <li key={link.href ?? link.label.en} style={{ fontSize: 17 }}>
                  <FooterLink href={link.href} label={link.label[lang]} />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: COLOR.muted,
              margin: "0 0 14px",
            }}
          >
            {lang === "hi" ? "संपर्क" : "Contact"}
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: 0 }}>
            {lang === "hi"
              ? "1800 118 005, किसी भी फोन से मुफ़्त। सुबह 9:15 से शाम 5:45, सोमवार से शुक्रवार।"
              : "1800 118 005, free from any phone. 9.15am to 5.45pm, Monday to Friday."}
          </p>
        </div>
      </div>
    </footer>
  );
}
