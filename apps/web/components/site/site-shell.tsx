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
          /* WCAG 2.2 A, 2.4.1 Bypass Blocks. Off-screen until focused, then
             pinned to the top-left as the first thing a keyboard user reaches
             — so the header's nav can be skipped instead of tabbed through on
             every page. */
          .epfo-skip-link {
            position: absolute;
            left: -9999px;
            top: 0;
            z-index: 100;
            background: ${COLOR.ink};
            color: ${COLOR.white};
            padding: 14px 20px;
            font-size: 17px;
            font-weight: 700;
            text-decoration: none;
          }
          .epfo-skip-link:focus {
            left: 0;
          }
          /* GOV.UK-style focus: yellow bar, dark edge. The yellow alone is
             1.60:1 against this page background, well under the 3:1 that
             WCAG 1.4.11 asks of a focus indicator — the contrast has to come
             from the dark ring. It used to sit only along the bottom edge
             (0 3px), so focus on the left, right or top edge of a control
             had no compliant boundary at all. Now it surrounds. */
          .epfo-site :focus-visible {
            outline: 3px solid #ffbf47;
            outline-offset: 0;
            box-shadow: 0 0 0 6px ${COLOR.ink};
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

          /* Mobile chrome. The layout itself was already fluid (auto-fit
             grids, tables in overflow wrappers) — what was wrong is that
             phones got DESKTOP sizing: 40px page padding, 40px headings,
             and a nav whose eight links wrapped onto five rows, so the
             header alone filled the first screen and every page's content
             started below the fold.

             !important is load-bearing here, not laziness: these pages set
             padding and font-size as inline styles (and the nav pulls
             NAV_BASE from design/tokens.ts), which no plain selector can
             override. Centralising it here beats editing twenty files. */
          @media (max-width: 640px) {
            .epfo-site main {
              padding-left: 20px !important;
              padding-right: 20px !important;
              padding-top: 28px !important;
            }
            .epfo-site h1 {
              font-size: 30px !important;
              line-height: 1.2 !important;
            }
            .epfo-site h2 {
              font-size: 22px !important;
            }
            /* Tighter nav so eight links wrap onto ~3 rows instead of 5. */
            .epfo-site nav a {
              padding: 10px 12px 8px !important;
              font-size: 15px !important;
              margin-right: 0 !important;
            }
          }
        `}</style>
        <div className="epfo-site" style={{ background: COLOR.bg }}>
          <a href="#main-content" className="epfo-skip-link">
            Skip to main content
          </a>
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
