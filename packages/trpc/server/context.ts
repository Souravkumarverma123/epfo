import type { Request, Response } from "express";
import { db } from "@repo/database";
import {
  AuthRepository,
  AuthService,
  ClaimsRepository,
  ClaimsService,
  ContributionRepository,
  DependencyRepository,
  EmployerAuthRepository,
  EmployerAuthService,
  EmployerService,
  EmploymentRepository,
  EstablishmentRepository,
  IdempotencyRepository,
  LedgerRepository,
  MemberRepository,
  MemberService,
  NomineeRepository,
  OutboxRepository,
  PassbookService,
  withTransaction,
  type EstablishmentRow,
  type MemberRow,
} from "@repo/application";
import { SESSION_COOKIE_NAME, parseCookies } from "./session-cookie";
import { EMPLOYER_SESSION_COOKIE_NAME } from "./employer-session-cookie";

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
  dependencyRepo: DependencyRepository;
  employerSessionId: string | null;
  employer: EstablishmentRow | null;
  employerAuthService: EmployerAuthService;
  employerService: EmployerService;
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
    new NomineeRepository(db),
  );
  const passbookService = new PassbookService(
    new EmploymentRepository(db),
    new ContributionRepository(db),
    new LedgerRepository(db),
  );
  const dependencyRepo = new DependencyRepository(db);
  const claimsService = new ClaimsService(
    new EmploymentRepository(db),
    new ContributionRepository(db),
    new LedgerRepository(db),
    new ClaimsRepository(db),
    new IdempotencyRepository(db),
    new OutboxRepository(db),
    dependencyRepo,
    withTransaction,
  );
  const employerAuthService = new EmployerAuthService(
    new EstablishmentRepository(db),
    new EmployerAuthRepository(db),
  );
  const employerService = new EmployerService(new EmploymentRepository(db));

  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[SESSION_COOKIE_NAME] ?? null;
  const employerSessionId = cookies[EMPLOYER_SESSION_COOKIE_NAME] ?? null;

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

  let employer: EstablishmentRow | null = null;
  if (employerSessionId) {
    try {
      employer = await employerAuthService.resolveSession(employerSessionId);
    } catch {
      employer = null;
    }
  }

  return {
    req,
    res,
    sessionId,
    member,
    authService,
    memberService,
    passbookService,
    claimsService,
    dependencyRepo,
    employerSessionId,
    employer,
    employerAuthService,
    employerService,
  };
}

export type { MemberRow, EstablishmentRow };
