"use client";

import { useState } from "react";
import { SiteShell } from "~/components/site/site-shell";
import { BADGE, COLOR } from "~/design/tokens";
import { trpc } from "~/trpc/client";

/**
 * Operations console — PRD §36/§37.
 *
 * The half of the PRD's "killer demonstration" (§47) that the citizen screens
 * can't show: steps 5 and 12, where an operator sees the claim the citizen
 * just filed and then pulls its whole end-to-end trace back out by operation
 * ID. Everything here is a read of committed state — this page computes no
 * status of its own, so what it shows is evidence rather than a second
 * opinion.
 */

const PANEL: React.CSSProperties = {
  border: `2px solid ${COLOR.ink}`,
  padding: "24px 28px",
  background: COLOR.white,
};

const LABEL: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: COLOR.muted,
  margin: "0 0 8px",
};

const MONO: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 14,
};

/** Status → badge intent. Colour is never the only signal: the status text
 *  itself is always present (PRD §31, "do not rely on color alone"). */
function badgeFor(status: string) {
  if (status === "COMPLETED") return BADGE.verified;
  if (status === "FAILED_RETRYABLE" || status === "ACTION_REQUIRED") return BADGE.action;
  if (status === "REJECTED" || status === "FAILED_PERMANENT" || status === "CANCELLED")
    return { background: "#f6d9d8", color: "#8a2321" };
  return BADGE.neutral;
}

function Badge({ children }: { children: string }) {
  return (
    <span
      style={{
        ...badgeFor(children),
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "5px 10px",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function formatPaise(paise: string): string {
  const negative = paise.startsWith("-");
  const digits = negative ? paise.slice(1) : paise;
  const padded = digits.padStart(3, "0");
  const rupees = padded.slice(0, -2);
  const rest = padded.slice(-2);
  const last3 = rupees.slice(-3);
  const head = rupees.slice(0, -3);
  const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${negative ? "-" : ""}₹${grouped}.${rest}`;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
}

/* ------------------------------------------------------------------ */

function ClaimDetail({ claimId, onBack }: { claimId: string; onBack: () => void }) {
  const detail = trpc.ops.claimDetail.useQuery({ claimId }, { refetchInterval: 3000 });
  const utils = trpc.useUtils();
  const retry = trpc.ops.retry.useMutation({
    onSuccess: () => {
      utils.ops.claimDetail.invalidate({ claimId });
      utils.ops.overview.invalidate();
    },
  });

  if (detail.isPending) return <p style={{ fontSize: 17 }}>Loading trace…</p>;
  if (detail.error)
    return (
      <div style={PANEL}>
        <p style={{ fontSize: 17, margin: 0 }}>{detail.error.message}</p>
      </div>
    );

  const { claim, transitions, audit, relatedAudit, outbox } = detail.data;
  const retryable = claim.status === "FAILED_RETRYABLE";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: 0,
          padding: 0,
          fontSize: 16,
          fontWeight: 600,
          color: COLOR.accent,
          textDecoration: "underline",
          textUnderlineOffset: 3,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        ← Back to console
      </button>

      <div style={PANEL}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <p style={LABEL}>Claim</p>
            <p style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>{claim.claimNumber}</p>
            <p style={{ fontSize: 16, color: COLOR.muted, margin: 0 }}>
              {claim.type} · {formatPaise(claim.amountPaise)} · version {claim.version}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={LABEL}>Status</p>
            <Badge>{claim.status}</Badge>
            {claim.reasonDetail ? (
              <p style={{ fontSize: 15, color: COLOR.muted, margin: "10px 0 0", maxWidth: 320 }}>
                {claim.reasonDetail}
              </p>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${COLOR.borderLight}` }}>
          <p style={LABEL}>Operation ID — the key every row below shares</p>
          <p style={{ ...MONO, margin: 0, wordBreak: "break-all" }}>{claim.operationId}</p>
        </div>

        {retryable ? (
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              disabled={retry.isPending}
              onClick={() => retry.mutate({ claimId })}
              style={{
                background: COLOR.accent,
                color: COLOR.white,
                border: 0,
                padding: "12px 20px",
                fontSize: 16,
                fontWeight: 700,
                cursor: retry.isPending ? "wait" : "pointer",
              }}
            >
              {retry.isPending ? "Retrying…" : "Retry now"}
            </button>
            <span style={{ fontSize: 15, color: COLOR.muted }}>
              {retry.data
                ? retry.data.changed
                  ? `Moved ${retry.data.statusBefore} → ${retry.data.statusAfter}.`
                  : `Still held at ${retry.data.statusAfter} — the dependency it needs is down.`
                : "Skips the step interval. The dependency gate and state machine still apply."}
            </span>
          </div>
        ) : null}
      </div>

      <div style={PANEL}>
        <p style={LABEL}>State transitions ({transitions.length})</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLOR.ink}` }}>
              <th scope="col" style={{ padding: "8px 8px 8px 0" }}>From</th>
              <th scope="col" style={{ padding: 8 }}>To</th>
              <th scope="col" style={{ padding: 8 }}>Actor</th>
              <th scope="col" style={{ padding: 8 }}>Note</th>
              <th scope="col" style={{ padding: "8px 0 8px 8px" }}>At</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((t) => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${COLOR.borderLight}` }}>
                <td style={{ padding: "10px 8px 10px 0", color: COLOR.muted }}>{t.fromStatus ?? "—"}</td>
                <td style={{ padding: 8, fontWeight: 600 }}>{t.toStatus}</td>
                <td style={{ padding: 8 }}>{t.actorType}</td>
                <td style={{ padding: 8, color: COLOR.muted }}>{t.note ?? "—"}</td>
                <td style={{ padding: "10px 0 10px 8px", color: COLOR.muted, whiteSpace: "nowrap" }}>
                  {timeOf(t.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={PANEL}>
        <p style={LABEL}>Audit trail ({audit.length + relatedAudit.length})</p>
        <p style={{ fontSize: 15, color: COLOR.muted, margin: "0 0 16px" }}>
          Append-only. Before/after snapshots are PII-redacted on write (PRD §24), so this table can be
          read by anyone who can reach the console without exposing a member&apos;s identity documents.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[...audit, ...relatedAudit]
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((a) => (
              <div
                key={a.id}
                style={{ borderLeft: `4px solid ${COLOR.accent}`, padding: "10px 0 10px 16px" }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{a.action}</span>
                  <span style={{ fontSize: 14, color: COLOR.muted }}>
                    {a.actorType}
                    {a.actorId ? ` · ${a.actorId}` : ""} · {a.resourceType} · {timeOf(a.createdAt)}
                  </span>
                </div>
                {a.reason ? (
                  <p style={{ fontSize: 15, color: COLOR.muted, margin: "4px 0 0" }}>{a.reason}</p>
                ) : null}
                {a.afterState ? (
                  <pre style={{ ...MONO, margin: "8px 0 0", whiteSpace: "pre-wrap", color: COLOR.mutedDark }}>
                    {JSON.stringify(a.afterState)}
                  </pre>
                ) : null}
              </div>
            ))}
        </div>
      </div>

      <div style={PANEL}>
        <p style={LABEL}>Outbox events ({outbox.length})</p>
        <p style={{ fontSize: 15, color: COLOR.muted, margin: "0 0 16px" }}>
          Written in the same transaction as the claim (PRD §17). There is no publisher in this
          prototype, so rows stay <strong>PENDING</strong> — that is the pattern working, not a
          failure: the trigger is durable and nothing was lost.
        </p>
        {outbox.map((o) => (
          <div
            key={o.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              padding: "10px 0",
              borderBottom: `1px solid ${COLOR.borderLight}`,
              flexWrap: "wrap",
            }}
          >
            <span style={{ ...MONO, fontWeight: 600 }}>{o.eventType}</span>
            <span style={{ fontSize: 14, color: COLOR.muted }}>
              v{o.schemaVersion} · {o.attempts} attempts · {timeOf(o.createdAt)}
            </span>
            <Badge>{o.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ClaimRows({ claims, onOpen }: { claims: Array<{ id: string; claimNumber: string; status: string; amountPaise: string; type: string; createdAt: string }>; onOpen: (id: string) => void }) {
  if (claims.length === 0)
    return <p style={{ fontSize: 16, color: COLOR.muted, margin: 0 }}>Nothing here yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {claims.map((c) => (
        <button
          key={c.id}
          onClick={() => onOpen(c.id)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: "14px 0",
            borderBottom: `1px solid ${COLOR.borderLight}`,
            background: "none",
            border: 0,
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            textAlign: "left",
            cursor: "pointer",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: COLOR.accent, textDecoration: "underline", textUnderlineOffset: 3 }}>
            {c.claimNumber}
          </span>
          <span style={{ fontSize: 15, color: COLOR.muted }}>
            {c.type} · {formatPaise(c.amountPaise)}
          </span>
          <Badge>{c.status}</Badge>
        </button>
      ))}
    </div>
  );
}

function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const overview = trpc.ops.overview.useQuery(undefined, { refetchInterval: 3000 });

  if (overview.isPending) return <p style={{ fontSize: 17 }}>Loading system state…</p>;
  if (overview.error)
    return <p style={{ fontSize: 17 }}>Could not load system state: {overview.error.message}</p>;

  const o = overview.data;
  const total = o.claimsByStatus.reduce((sum, b) => sum + b.count, 0);
  const completed = o.claimsByStatus.find((b) => b.status === "COMPLETED")?.count ?? 0;
  const reconciled = o.reconciliation.discrepancies.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        <div style={PANEL}>
          <p style={LABEL}>Dependencies</p>
          {o.dependencies.length === 0 ? (
            <p style={{ fontSize: 16, color: COLOR.muted, margin: 0 }}>All healthy (no overrides set).</p>
          ) : (
            o.dependencies.map((d) => (
              <div key={d.dependency} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", gap: 12 }}>
                <span style={{ fontSize: 16 }}>{d.dependency}</span>
                <Badge>{d.mode}</Badge>
              </div>
            ))
          )}
        </div>

        <div style={PANEL}>
          <p style={LABEL}>Claims</p>
          <p style={{ fontSize: 32, fontWeight: 800, margin: "0 0 4px" }}>{total}</p>
          <p style={{ fontSize: 15, color: COLOR.muted, margin: 0 }}>
            {completed} completed · {o.stuckClaims.length} held
          </p>
        </div>

        <div style={PANEL}>
          <p style={LABEL}>Acknowledgement latency</p>
          <p style={{ fontSize: 32, fontWeight: 800, margin: "0 0 4px" }}>
            {o.latencyMs.p95 == null ? "—" : `${Math.round(o.latencyMs.p95)} ms`}
          </p>
          <p style={{ fontSize: 15, color: COLOR.muted, margin: 0 }}>
            P95 · target &lt; 1000 ms (PRD §28)
          </p>
        </div>

        <div style={PANEL}>
          <p style={LABEL}>Outbox</p>
          {o.outboxByStatus.length === 0 ? (
            <p style={{ fontSize: 16, color: COLOR.muted, margin: 0 }}>No events yet.</p>
          ) : (
            o.outboxByStatus.map((b) => (
              <div key={b.status} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", gap: 12 }}>
                <span style={{ fontSize: 16 }}>{b.status}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{b.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={PANEL}>
        <p style={LABEL}>Reconciliation — derived balance vs the ledger it comes from</p>
        <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>
          {reconciled
            ? `${o.reconciliation.membersChecked} member${o.reconciliation.membersChecked === 1 ? "" : "s"} checked, no discrepancies`
            : `${o.reconciliation.discrepancies.length} discrepancy(ies) found`}
        </p>
        <p style={{ fontSize: 15, color: COLOR.muted, margin: 0 }}>
          Recomputes credits minus debits from <code>ledger_entries</code> and compares it against the
          cached <code>member_balances</code> row (PRD §12, §34). A mismatch here would mean the fast-read
          balance had drifted from financial truth.
        </p>
        {o.reconciliation.discrepancies.map((d) => (
          <p key={d.memberId} style={{ ...MONO, margin: "10px 0 0", color: "#8a2321" }}>
            {d.memberId}: cached {formatPaise(d.derivedBalancePaise)} vs ledger{" "}
            {formatPaise(d.ledgerBalancePaise)} (off by {formatPaise(d.differencePaise)})
          </p>
        ))}
      </div>

      {o.stuckClaims.length > 0 ? (
        <div style={{ ...PANEL, background: COLOR.actionBg, borderColor: COLOR.ink }}>
          <p style={{ ...LABEL, color: COLOR.actionText }}>Held claims — waiting on a dependency</p>
          <p style={{ fontSize: 15, color: COLOR.actionText, margin: "0 0 12px" }}>
            These are safe, not lost: each remembers the step it was attempting and resumes on its own
            when the dependency returns. Open one to retry it by hand.
          </p>
          <ClaimRows claims={o.stuckClaims} onOpen={onOpen} />
        </div>
      ) : null}

      <div style={PANEL}>
        <p style={LABEL}>Recent claims</p>
        <ClaimRows claims={o.recentClaims} onOpen={onOpen} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OpsContent() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);

  const search = trpc.ops.search.useQuery({ query }, { enabled: query.trim().length > 0 });

  return (
    <main id="main-content" style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 40px 96px" }}>
      <div style={{ background: COLOR.actionBg, padding: "16px 20px", margin: "0 0 32px" }}>
        <p style={{ fontSize: 15, color: COLOR.actionText, margin: 0, fontWeight: 600 }}>
          Operations console — prototype, and open on purpose. There is no officer login in this build,
          so PRD §23&apos;s OIDC + RBAC is stated as not implemented rather than mimicked with a third
          fake sign-in. The retry control still writes an audit row naming who asked.
        </p>
      </div>

      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        Operations console
      </h1>
      <p style={{ fontSize: 18, color: COLOR.muted, margin: "0 0 32px", maxWidth: 720 }}>
        Search a claim by claim number, UAN or operation ID and read its full history — state
        transitions, audit trail and outbox events — without touching a database. This is the answer to
        &quot;where is my transaction?&quot;, asked from the other side of the counter.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpenClaimId(null);
          setQuery(draft);
        }}
        style={{ display: "flex", gap: 12, margin: "0 0 32px", flexWrap: "wrap" }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="EPFO-928311, 100234567890, or an operation ID"
          aria-label="Search by claim number, UAN or operation ID"
          style={{
            flex: "1 1 320px",
            border: `2px solid ${COLOR.ink}`,
            padding: "14px 16px",
            fontSize: 17,
            fontFamily: "inherit",
            background: COLOR.white,
            color: COLOR.ink,
          }}
        />
        <button
          type="submit"
          style={{
            background: COLOR.accent,
            color: COLOR.white,
            border: 0,
            padding: "14px 28px",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Search
        </button>
        {query ? (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              setQuery("");
              setOpenClaimId(null);
            }}
            style={{
              background: "none",
              // COLOR.border is 1.45:1 on this background — fine for a table
              // divider, not for the boundary of an active control
              // (WCAG 1.4.11 needs 3:1). COLOR.muted is 7.67:1.
              border: `2px solid ${COLOR.muted}`,
              padding: "14px 20px",
              fontSize: 17,
              fontWeight: 600,
              cursor: "pointer",
              color: COLOR.ink,
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      {openClaimId ? (
        <ClaimDetail claimId={openClaimId} onBack={() => setOpenClaimId(null)} />
      ) : query.trim() ? (
        <div style={PANEL}>
          <p style={LABEL}>
            {search.data ? `Matched as: ${search.data.kind}` : "Searching…"}
          </p>
          {search.data ? <ClaimRows claims={search.data.claims} onOpen={setOpenClaimId} /> : null}
        </div>
      ) : (
        <Overview onOpen={setOpenClaimId} />
      )}
    </main>
  );
}

export default function OpsPage() {
  return (
    <SiteShell showPrototypeBanner={false}>
      <OpsContent />
    </SiteShell>
  );
}
