"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "~/trpc/client";
import { COLOR, NAV_BASE, NAV_ON } from "~/design/tokens";
import { CHROME_COPY, useLang } from "~/design/lang";

const NAV_ITEMS = [
  { label: { en: "Your account", hi: "आपका खाता" }, href: "/dashboard" },
  { label: { en: "Passbook", hi: "पासबुक" }, href: "/passbook" },
  { label: { en: "Claims", hi: "दावे" }, href: "/claims" },
  { label: { en: "Claim status", hi: "दावा स्थिति" }, href: "/claims/status" },
  { label: { en: "Your details", hi: "आपकी जानकारी" }, href: "/profile" },
  { label: { en: "Help", hi: "सहायता" }, href: "/help" },
  { label: { en: "For employers", hi: "नियोक्ता" }, href: "/employer" },
  { label: { en: "All services", hi: "सभी सेवाएँ" }, href: "/services" },
] as const;

/** "100234567890" -> "100 234 567 890" */
function formatUan(uan: string): string {
  return uan.replace(/(\d{3})(?=\d)/g, "$1 ");
}

export function SiteHeader() {
  const { lang, setLang } = useLang();
  const L = CHROME_COPY[lang];
  const pathname = usePathname();

  const me = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const signOut = trpc.auth.signOut.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const member = me.data?.member ?? null;

  return (
    <>
      {/* Top bar */}
      <div style={{ background: COLOR.ink, color: COLOR.white }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "12px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>EPFO</span>
            <span style={{ fontSize: 14, color: COLOR.headerMuted }}>
              Employees&apos; Provident Fund Organisation, India
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <button
              onClick={() => setLang(lang === "hi" ? "en" : "hi")}
              style={{
                background: "none",
                border: 0,
                padding: 0,
                color: COLOR.white,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: 3,
                cursor: "pointer",
              }}
            >
              {L.langSwitch}
            </button>
            <span style={{ fontSize: 14, color: COLOR.headerMuted }}>{L.helpline}</span>
          </div>
        </div>
      </div>

      {/* White header */}
      <div style={{ background: COLOR.white, borderBottom: `1px solid ${COLOR.border}` }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "18px 40px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              background: "none",
              border: 0,
              padding: "0 0 18px",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: COLOR.ink,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            {L.service}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 18 }}>
            {member ? (
              <>
                <span style={{ fontSize: 15, color: COLOR.muted }}>UAN {formatUan(member.uan)}</span>
                <span style={{ fontSize: 15, color: COLOR.border }}>|</span>
                <button
                  onClick={() => signOut.mutate()}
                  disabled={signOut.isPending}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLOR.accent,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    cursor: "pointer",
                  }}
                >
                  {L.signout}
                </button>
              </>
            ) : (
              !me.isLoading && (
                <Link href="/login" style={{ fontSize: 15, fontWeight: 600 }}>
                  {L.signin}
                </Link>
              )
            )}
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
          <nav
            style={{
              display: "flex",
              gap: 0,
              flexWrap: "wrap",
              borderTop: `1px solid ${COLOR.borderLight}`,
            }}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={pathname === item.href ? NAV_ON : NAV_BASE}
              >
                {item.label[lang]}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
