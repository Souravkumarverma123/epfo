"use client";

import type { ReactNode } from "react";
import { COLOR } from "~/design/tokens";

/**
 * Shared inner layout for the informational pages (About, Schemes, RTI,
 * Accessibility, Privacy, Feedback) that used to be dead `href="#"` links
 * in the footer. Deliberately does NOT render SiteShell itself — every
 * page in this app puts SiteShell at the outer/default-export level and
 * calls useLang() only in a component rendered AS ITS CHILD, because
 * useLang()'s LangProvider is mounted inside SiteShell: calling it any
 * higher in the tree throws ("must be used inside <LangProvider>"). Each
 * of the six pages using this component follows that same shape.
 */
export function StaticPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "48px 40px 96px" }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        {title}
      </h1>
      {intro && (
        <p style={{ fontSize: 20, lineHeight: 1.5, color: COLOR.muted, margin: "0 0 40px" }}>{intro}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 28, fontSize: 18, lineHeight: 1.65, color: COLOR.mutedDark }}>
        {children}
      </div>
    </main>
  );
}

export function StaticSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", color: COLOR.ink, margin: "0 0 10px" }}>
        {heading}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </section>
  );
}
