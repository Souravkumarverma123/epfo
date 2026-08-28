import type { Request, Response } from "express";
import { db } from "@repo/database";
import {
  AuthRepository,
  AuthService,
  ClaimsRepository,
  ClaimsService,
  ContributionRepository,
  EmploymentRepository,
  IdempotencyRepository,
  LedgerRepository,
  MemberRepository,
  MemberService,
  OutboxRepository,
  PassbookService,
  withTransaction,
  type MemberRow,
} from "@repo/application";
import { SESSION_COOKIE_NAME, parseCookies } from "./session-cookie";

/**
 * Every request's session is resolved once, here, before any procedure runs.
 * Procedures never touch cookies or AuthService directly — they read
 * `ctx.member`, which is either the signed-in member or null. This keeps the
 * "how are you authenticated" question in exactly one place.
 *
 * Services are wired once per request against the shared `db` pool — routes
 * use ctx.authService / ctx.memberService / ctx.passbookService /
 * ctx.claimsService instead of constructing repositories themselves.
 */
export interface Context {
  req: Request;
  res: Response;
  sessionId: string | null;
  member: MemberRow | null;
  authService: AuthService;
  memberService: MemberService;
  passbookService: PassbookService;
  claimsService: ClaimsService;
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  const authService = new AuthService(new MemberRepository(db), new AuthRepository(db));
  const memberService = new MemberService(
    new MemberRepository(db),
    new EmploymentRepository(db),
    new ContributionRepository(db),
    new LedgerRepository(db),
  );
  const passbookService = new PassbookService(
    new EmploymentRepository(db),
    new ContributionRepository(db),
    new LedgerRepository(db),
  );
  const claimsService = new ClaimsService(
    new EmploymentRepository(db),
    new ContributionRepository(db),
    new LedgerRepository(db),
    new ClaimsRepository(db),
    new IdempotencyRepository(db),
    new OutboxRepository(db),
    withTransaction,
  );

  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[SESSION_COOKIE_NAME] ?? null;

  let member: MemberRow | null = null;
  if (sessionId) {
    try {
      member = await authService.resolveSession(sessionId);
    } catch {
      // Expired or unknown session: treat the request as signed-out rather
      // than erroring here — protectedProcedure is what decides whether an
      // absent member is a problem for a given route.
      member = null;
    }
  }

  return { req, res, sessionId, member, authService, memberService, passbookService, claimsService };
}

export type { MemberRow };
