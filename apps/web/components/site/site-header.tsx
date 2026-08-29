"use client";

import { useState } from "react";
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
  // Mobile only — see the <style jsx> block below. Desktop always shows the
  // nav; this state has no effect there. Found on an actual mobile-viewport
  // check: at 375px this 8-item nav rendered open and unconditionally, so a
  // signed-OUT visitor landing on /login saw the full member nav (Your
  // account, Passbook, Claims...) stacked into 3 tall rows ABOVE the login
  // form — the actual UAN field was pushed several screens down, reading as
  // "the login form is missing".
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const me = trpc.auth.me.useQuery();
  const employerMe = trpc.employerAuth.me.useQuery();
  const utils = trpc.useUtils();
  const signOut = trpc.auth.signOut.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const employerSignOut = trpc.employerAuth.signOut.useMutation({
    onSuccess: () => utils.employerAuth.me.invalidate(),
  });
  const member = me.data?.member ?? null;
  // Member and employer are independent sessions (see
  // employer-session-cookie.ts) — a browser can hold both at once. The
  // member identity takes visual priority in the header since it's the
  // primary persona this site is built around; the employer identity shows
  // only when there is no signed-in member.
  const employer = employerMe.data?.establishment ?? null;

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
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>EPFO One</span>
            <span style={{ fontSize: 14, color: COLOR.headerMuted }}>
              {lang === "hi"
                ? "अनौपचारिक प्रोटोटाइप — भारत सरकार से संबद्ध नहीं"
                : "Unofficial prototype, not affiliated with the Government of India"}
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
            ) : employer ? (
              <>
                <span style={{ fontSize: 15, color: COLOR.muted }}>{employer.name}</span>
                <span style={{ fontSize: 15, color: COLOR.border }}>|</span>
                <button
                  onClick={() => employerSignOut.mutate()}
                  disabled={employerSignOut.isPending}
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
              !me.isLoading &&
              !employerMe.isLoading && (
                // flexWrap + nowrap text: on a narrow screen these two
                // pills stack onto their own rows instead of both staying
                // on one row and having their TEXT wrap to two lines —
                // which, combined with borderRadius:999, turned each pill
                // into a distorted stretched capsule (found on an actual
                // mobile-viewport check).
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <Link
                    href="/login"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 15,
                      fontWeight: 700,
                      color: COLOR.accent,
                      border: `2px solid ${COLOR.accent}`,
                      borderRadius: 999,
                      padding: "9px 18px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {L.employeeLogin}
                  </Link>
                  <Link
                    href="/employer/login"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 15,
                      fontWeight: 700,
                      color: COLOR.ink,
                      border: `2px solid ${COLOR.ink}`,
                      borderRadius: 999,
                      padding: "9px 18px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {L.employerLogin}
                  </Link>
                </div>
              )
            )}
            {/* Hidden on desktop by the <style jsx> below; the nav below is
                always open there and this button has nothing to do. */}
            <button
              className="epfo-nav-toggle"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-expanded={mobileNavOpen}
              aria-controls="epfo-site-nav"
              aria-label={
                mobileNavOpen
                  ? lang === "hi"
                    ? "मेनू बंद करें"
                    : "Close menu"
                  : lang === "hi"
                    ? "मेनू खोलें"
                    : "Open menu"
              }
              style={{
                display: "none",
                background: "none",
                border: `2px solid ${COLOR.ink}`,
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 20,
                lineHeight: 1,
                color: COLOR.ink,
                cursor: "pointer",
              }}
            >
              {mobileNavOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
          <nav
            id="epfo-site-nav"
            className={mobileNavOpen ? "epfo-site-nav epfo-site-nav--open" : "epfo-site-nav"}
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
                onClick={() => setMobileNavOpen(false)}
                style={pathname === item.href ? NAV_ON : NAV_BASE}
              >
                {item.label[lang]}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <style jsx>{`
        /* Mobile-only nav collapse. Scoped here (not site-shell.tsx's
           shared block) because the toggle button and the nav it controls
           both live in this one component — the interactive behaviour and
           its CSS stay together instead of splitting across files.
           !important beats the elements' own inline display styles, same
           reasoning as site-shell.tsx's mobile overrides. */
        @media (max-width: 640px) {
          .epfo-nav-toggle {
            display: inline-flex !important;
            align-items: center;
          }
          .epfo-site-nav {
            display: none !important;
          }
          .epfo-site-nav.epfo-site-nav--open {
            display: flex !important;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
