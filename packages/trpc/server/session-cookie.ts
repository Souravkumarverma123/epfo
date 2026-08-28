/** Shared between context.ts (reads it) and the auth routes (set/clear it). */
export const SESSION_COOKIE_NAME = "epfo_session";
export const SESSION_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours, matches AuthService

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}
