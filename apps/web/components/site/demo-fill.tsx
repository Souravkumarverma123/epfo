"use client";

import { COLOR } from "~/design/tokens";

/** The seeded member and establishment (see packages/database/seed.ts).
 *  Kept here so the login screens and any docs point at one source. */
export const DEMO_UAN = "100234567890";
export const DEMO_ESTABLISHMENT_CODE = "BGBNG00456780000123";

/**
 * One-click credential fill for the demo accounts.
 *
 * Exists because a placeholder showing the demo value reads as an
 * already-filled field at a glance — but the input is empty, so the
 * submit button stays disabled and the page looks broken instead of
 * empty. (This caught out the person building it, mid-test.) A visible
 * button is the honest version: it says these are demo credentials, and
 * fills them in for you.
 */
export function DemoFill({
  label,
  value,
  display,
  onFill,
}: {
  label: string;
  value: string;
  /** Formatted for reading (spaced UAN); `value` is what actually gets filled. */
  display?: string;
  onFill: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        background: COLOR.panel,
        padding: "10px 14px",
        margin: "0 0 24px",
      }}
    >
      <span style={{ fontSize: 15, color: COLOR.mutedDark, fontWeight: 600 }}>{label}</span>
      <code style={{ fontSize: 15, color: COLOR.ink, fontFamily: "monospace" }}>{display ?? value}</code>
      <button
        type="button"
        onClick={onFill}
        style={{
          marginLeft: "auto",
          background: COLOR.white,
          border: `2px solid ${COLOR.ink}`,
          padding: "6px 14px",
          fontSize: 15,
          fontWeight: 700,
          color: COLOR.ink,
          cursor: "pointer",
        }}
      >
        Fill in
      </button>
    </div>
  );
}
