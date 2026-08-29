import type { Request, Response } from "express";
import OpenAI from "openai";
import { db } from "@repo/database";
import {
  AssistantService,
  AuditRepository,
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
  OpsService,
  OutboxRepository,
  PassbookService,
  withTransaction,
  type EstablishmentRow,
  type MemberRow,
} from "@repo/application";
import { SESSION_COOKIE_NAME, parseCookies } from "./session-cookie";
import { EMPLOYER_SESSION_COOKIE_NAME } from "./employer-session-cookie";

/** One OpenAI client for the process, not per-request — same reasoning as
 *  `db` being a module-level singleton in @repo/database. Undefined (not
 *  constructed) when no key is set, so local dev without one doesn't
 *  crash at import time; AssistantService's caller is what turns that
 *  into a clean error for a chat request specifically. */
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

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
  auditRepo: AuditRepository;
  opsService: OpsService;
  employerSessionId: string | null;
  employer: EstablishmentRow | null;
  employerAuthService: EmployerAuthService;
  employerService: EmployerService;
  /** null when OPENAI_API_KEY isn't set (local dev without one) —
   *  assistantRouter is what turns that into a clean user-facing error. */
  assistantService: AssistantService | null;
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
  const auditRepo = new AuditRepository(db);
  const claimsService = new ClaimsService(
    new EmploymentRepository(db),
    new ContributionRepository(db),
    new LedgerRepository(db),
    new ClaimsRepository(db),
    new IdempotencyRepository(db),
    new OutboxRepository(db),
    dependencyRepo,
    auditRepo,
    withTransaction,
  );
  const employerAuthService = new EmployerAuthService(
    new EstablishmentRepository(db),
    new EmployerAuthRepository(db),
  );
  const employerService = new EmployerService(new EmploymentRepository(db));
  const opsService = new OpsService(
    new ClaimsRepository(db),
    auditRepo,
    new OutboxRepository(db),
    dependencyRepo,
    new LedgerRepository(db),
    new MemberRepository(db),
    claimsService,
  );
  const assistantService = openaiClient
    ? new AssistantService(openaiClient, memberService, claimsService)
    : null;

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
    auditRepo,
    opsService,
    employerSessionId,
    employer,
    employerAuthService,
    employerService,
    assistantService,
  };
}

export type { MemberRow, EstablishmentRow };
