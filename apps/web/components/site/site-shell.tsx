"use client";

import type { ReactNode } from "react";
import { publicSans, COLOR } from "~/design/tokens";
import { LangProvider } from "~/design/lang";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AiAssistant } from "./ai-assistant";

/**
 * The chrome every screen in the design shares: top bar, white header + nav,
 * prototype banner, footer. A page only supplies its own <main> content.
 */
export function SiteShell({
  children,
  showPrototypeBanner = true,
}: {
  children: ReactNode;
  showPrototypeBanner?: boolean;
}) {
  return (
    <LangProvider>
      <div
        className={publicSans.className}
        style={{
          color: COLOR.ink,
          background: COLOR.bg,
          minHeight: "100vh",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <style jsx global>{`
          .epfo-site a {
            color: ${COLOR.accent};
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .epfo-site a:hover {
            color: ${COLOR.accentDark};
            text-decoration-thickness: 3px;
          }
          .epfo-site button {
            font-family: inherit;
          }
          .epfo-site :focus-visible {
            outline: 3px solid #ffbf47;
            outline-offset: 0;
            box-shadow: 0 3px 0 0 ${COLOR.ink};
          }
          /* Shared by every "main content + sidebar" page (Dashboard, Help,
             Claim status): fixed 1.6fr/1fr side-by-side on desktop, but a
             hard 1.6fr/1fr split never collapses on its own — below 800px
             it was squeezing the main column (and its table) into ~140px
             instead of stacking. Found by an actual mobile-viewport check,
             not assumed. */
          .two-col-layout {
            display: grid;
            grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
            gap: 64px;
            align-items: start;
          }
          @media (max-width: 800px) {
            .two-col-layout {
              grid-template-columns: 1fr;
              gap: 32px;
            }
          }
        `}</style>
        <div className="epfo-site" style={{ background: COLOR.bg }}>
          <SiteHeader />
          {showPrototypeBanner && (
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 40px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  borderBottom: `1px solid ${COLOR.border}`,
                  paddingBottom: 16,
                }}
              >
                <span
                  style={{
                    background: COLOR.accent,
                    color: COLOR.white,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "6px 10px",
                  }}
                >
                  Prototype
                </span>
                <span style={{ fontSize: 15, color: COLOR.muted }}>
                  This is a redesign concept. Figures and records are illustrative.
                </span>
              </div>
            </div>
          )}
          {children}
          <SiteFooter />
          <AiAssistant />
        </div>
      </div>
    </LangProvider>
  );
}
