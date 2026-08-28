/** Employer's own cookie, deliberately distinct from session-cookie.ts's
 *  member cookie — a browser can hold a member session and an employer
 *  session at the same time without either signing the other out, since
 *  they're two independent personas, not one account switching roles. */
export const EMPLOYER_SESSION_COOKIE_NAME = "epfo_employer_session";
export const EMPLOYER_SESSION_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours, matches EmployerAuthService

export { parseCookies } from "./session-cookie";
