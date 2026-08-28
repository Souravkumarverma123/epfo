"use client";

import { SiteShell } from "~/components/site/site-shell";
import { COLOR } from "~/design/tokens";
import { trpc } from "~/trpc/client";

/**
 * Demo control panel — not part of the citizen product, not gated behind
 * member login. This is what makes PRD §4's central claim demonstrable
 * live: flip KYC to DOWN while a claim is in flight and watch its status
 * page (polling independently, anyone's browser tab) show "your claim is
 * safe" instead of an error, then resume on its own when you flip it back.
 */
const DEPENDENCIES = [
  {
    key: "kyc" as const,
    label: "KYC verification",
    description: "Gates the KYC_PENDING step of every in-flight claim.",
  },
  {
    key: "payment" as const,
    label: "Payment API",
    description: "Gates the PAYMENT_PENDING step of every in-flight claim.",
  },
];

function DependenciesContent() {
  const states = trpc.demo.getDependencyStates.useQuery(undefined, { refetchInterval: 2000 });
  const utils = trpc.useUtils();
  const setMode = trpc.demo.setDependencyState.useMutation({
    onSuccess: () => utils.demo.getDependencyStates.invalidate(),
  });

  const modeOf = (key: string) => states.data?.find((s) => s.dependency === key)?.mode ?? "UP";

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px 96px" }}>
      <div style={{ background: "#f9e5c9", padding: "16px 20px", margin: "0 0 32px" }}>
        <p style={{ fontSize: 15, color: "#5c3d0a", margin: 0, fontWeight: 600 }}>
          Demo control panel — not part of the citizen product. Flip a dependency here, then watch a
          claim&apos;s status page (open in another tab) react on its own.
        </p>
      </div>

      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        Dependency controls
      </h1>
      <p style={{ fontSize: 18, color: COLOR.muted, margin: "0 0 40px", maxWidth: 640 }}>
        Every claim in progress checks these before moving past the matching step. Set one to Down, submit
        or open a claim, and watch it hold at &quot;Taking longer than usual&quot; instead of erroring —
        then set it back to Up and watch it resume within a few seconds.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {DEPENDENCIES.map((dep) => {
          const mode = modeOf(dep.key);
          const isUp = mode === "UP";
          return (
            <div key={dep.key} style={{ border: `2px solid ${COLOR.ink}`, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{dep.label}</p>
                <p style={{ fontSize: 16, color: COLOR.muted, margin: 0 }}>{dep.description}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "8px 14px",
                    background: isUp ? "#dcecdf" : "#f9e5c9",
                    color: isUp ? "#14452b" : "#5c3d0a",
                  }}
                >
                  {mode}
                </span>
                <button
                  disabled={setMode.isPending}
                  onClick={() => setMode.mutate({ dependency: dep.key, mode: isUp ? "DOWN" : "UP" })}
                  style={{
                    background: isUp ? "#8a2321" : COLOR.accent,
                    color: COLOR.white,
                    border: 0,
                    padding: "14px 22px",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isUp ? "Take down" : "Restore"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function DependenciesPage() {
  return (
    <SiteShell showPrototypeBanner={false}>
      <DependenciesContent />
    </SiteShell>
  );
}
