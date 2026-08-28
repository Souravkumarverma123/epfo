import { MemberRepository, type MemberRow } from "../repositories/member-repository";
import { AuthRepository } from "../repositories/auth-repository";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class InvalidUanError extends Error {
  constructor() {
    super("No member found for this UAN");
    this.name = "InvalidUanError";
  }
}

export class InvalidOtpError extends Error {
  constructor() {
    super("Incorrect or expired code");
    this.name = "InvalidOtpError";
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired or not found");
    this.name = "SessionExpiredError";
  }
}

/**
 * Mock login (PRD §6: mock identity, no real credentials or SMS gateway).
 * Business logic only — persistence goes through the injected repositories,
 * never through @repo/database directly. A real deployment replaces this
 * class with an OIDC client; nothing that calls AuthService needs to change,
 * because the shape it returns (a session + a member) stays the same.
 */
export class AuthService {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly authRepo: AuthRepository,
  ) {}

  private normalizeUan(uan: string): string {
    return uan.replace(/\D/g, "");
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /**
   * Look up the member and issue an OTP. Returns the code directly in the
   * result — DEMO ONLY. There is no SMS/notification integration yet (that's
   * Phase 4, PRD §14); in a real deployment this method would dispatch to
   * that integration and never return the code to the caller.
   */
  async requestOtp(uan: string): Promise<{ memberId: string; devOtp: string }> {
    const member = await this.memberRepo.findByUan(this.normalizeUan(uan));
    if (!member) throw new InvalidUanError();

    const code = this.generateCode();
    await this.authRepo.createOtp({
      memberId: member.id,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    return { memberId: member.id, devOtp: code };
  }

  /** Verify the code and issue a session. Throws if wrong, already used, or expired. */
  async verifyOtp(uan: string, code: string): Promise<{ sessionId: string; member: MemberRow }> {
    const member = await this.memberRepo.findByUan(this.normalizeUan(uan));
    if (!member) throw new InvalidUanError();

    const otp = await this.authRepo.findLatestUnconsumedOtp(member.id);
    if (!otp || otp.code !== code || otp.expiresAt < new Date()) {
      throw new InvalidOtpError();
    }

    await this.authRepo.consumeOtp(otp.id);
    const session = await this.authRepo.createSession({
      memberId: member.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });

    return { sessionId: session.id, member };
  }

  /** Resolve a session cookie value to the member it belongs to, or throw. */
  async resolveSession(sessionId: string): Promise<MemberRow> {
    const session = await this.authRepo.findSession(sessionId);
    if (!session || session.expiresAt < new Date()) throw new SessionExpiredError();

    const member = await this.memberRepo.findById(session.memberId);
    if (!member) throw new SessionExpiredError();
    return member;
  }

  async signOut(sessionId: string): Promise<void> {
    await this.authRepo.deleteSession(sessionId);
  }
}
