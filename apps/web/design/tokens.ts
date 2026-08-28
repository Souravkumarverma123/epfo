/**
 * Design tokens transcribed from the approved design file
 * ("EPFO Portal Redesign.dc.html"). Every screen in the app uses these same
 * values — nothing is redeclared per-page.
 */
import { Public_Sans } from "next/font/google";

export const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

export const COLOR = {
  bg: "#fdfcfa",
  ink: "#1a1815",
  white: "#ffffff",
  muted: "#56514a",
  mutedDark: "#3a3630",
  border: "#d8d3cb",
  borderLight: "#ece8e1",
  headerMuted: "#b8b2a8",
  accent: "#262f8c",
  accentDark: "#12174a",
  panel: "#f4f1ea",
  success: "#1b5c3a",
  actionBg: "#f9e5c9",
  actionText: "#5c3d0a",
  verifiedBg: "#dcecdf",
  verifiedText: "#14452b",
  neutralBg: "#e6e3dc",
  neutralText: "#3a3630",
} as const;

export const NAV_BASE: React.CSSProperties = {
  background: "none",
  border: 0,
  borderBottom: "5px solid transparent",
  padding: "14px 20px 12px",
  margin: "0 4px 0 0",
  fontSize: 17,
  fontWeight: 600,
  color: COLOR.accent,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  whiteSpace: "nowrap",
};

export const NAV_ON: React.CSSProperties = {
  ...NAV_BASE,
  borderBottom: `5px solid ${COLOR.accent}`,
  fontWeight: 700,
  color: COLOR.ink,
  textDecoration: "none",
};

/** Pill badge styles, reused on Dashboard, Passbook, KYC, Help. */
export const BADGE = {
  action: { background: COLOR.actionBg, color: COLOR.actionText },
  verified: { background: COLOR.verifiedBg, color: COLOR.verifiedText },
  neutral: { background: COLOR.neutralBg, color: COLOR.neutralText },
} as const;
