"use client";

import Link from "next/link";
import { formatINR, parsePaiseWire, statusCopy, type ClaimStatus } from "@repo/domain";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireAuth } from "~/components/site/require-auth";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";

function ClaimsListContent() {
  const { lang } = useLang();
  const claims = trpc.claims.list.useQuery();

  return (
    <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        {lang === "hi" ? "आपके दावे" : "Your claims"}
      </h1>

      {claims.isLoading && <p style={{ color: COLOR.muted }}>Loading...</p>}

      {claims.data && claims.data.length === 0 && (
        <div style={{ background: COLOR.panel, padding: "28px 32px", maxWidth: 640, margin: "24px 0" }}>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: "0 0 16px" }}>
            {lang === "hi" ? "आपने अभी तक कोई दावा दर्ज नहीं किया है।" : "You have not filed a claim yet."}
          </p>
          <Link href="/claims" style={{ fontSize: 17, fontWeight: 700 }}>
            {lang === "hi" ? "पैसे निकालें" : "Withdraw money"}
          </Link>
        </div>
      )}

      {claims.data && claims.data.length > 0 && (
        <ul style={{ listStyle: "none", margin: "24px 0 0", padding: 0 }}>
          {claims.data.map((c, i) => {
            const copy = statusCopy(c.status as ClaimStatus, lang);
            return (
              <li key={c.claimNumber} style={{ borderTop: `1px solid ${COLOR.border}`, borderBottom: i === claims.data.length - 1 ? `1px solid ${COLOR.border}` : undefined, padding: "22px 0", display: "flex", gap: 20, justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <span>
                  <Link href={`/claims/status/${c.claimNumber}`} style={{ fontSize: 20, fontWeight: 700 }}>
                    {c.claimNumber}
                  </Link>
                  <span style={{ display: "block", fontSize: 17, color: COLOR.muted, marginTop: 6 }}>
                    {formatINR(parsePaiseWire(c.amountPaise))} · {new Date(c.createdAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN")}
                  </span>
                </span>
                <span style={{ background: COLOR.panel, color: COLOR.mutedDark, fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", padding: "6px 10px", whiteSpace: "nowrap" }}>
                  {copy.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default function ClaimsListPage() {
  return (
    <SiteShell>
      <RequireAuth>{() => <ClaimsListContent />}</RequireAuth>
    </SiteShell>
  );
}
