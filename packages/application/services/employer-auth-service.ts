import { EstablishmentRepository, type EstablishmentRow } from "../repositories/establishment-repository";
import { EmployerAuthRepository } from "../repositories/employer-auth-repository";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class InvalidEstablishmentCodeError extends Error {
  constructor() {
    super("No establishment found for this code");
    this.name = "InvalidEstablishmentCodeError";
  }
}

export class InvalidEmployerOtpError extends Error {
  constructor() {
    super("Incorrect or expired code");
    this.name = "InvalidEmployerOtpError";
  }
}

export class EmployerSessionExpiredError extends Error {
  constructor() {
    super("Session expired or not found");
    this.name = "EmployerSessionExpiredError";
  }
}

/**
 * Mock login for the employer persona — exact mirror of AuthService, one
 * table set removed (mock identity, no real credentials; see PRD §6's
 * rationale, which applies here just as much as it does to members).
 */
export class EmployerAuthService {
  constructor(
    private readonly establishmentRepo: EstablishmentRepository,
    private readonly employerAuthRepo: EmployerAuthRepository,
  ) {}

  private normalizeCode(code: string): string {
    return code.replace(/\s/g, "").toUpperCase();
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /** Look up the establishment and issue an OTP. Returns the code directly
   *  in the result — DEMO ONLY, same caveat as AuthService.requestOtp. */
  async requestOtp(establishmentCode: string): Promise<{ establishmentId: string; devOtp: string }> {
    const establishment = await this.establishmentRepo.findByCode(this.normalizeCode(establishmentCode));
    if (!establishment) throw new InvalidEstablishmentCodeError();

    const code = this.generateCode();
    await this.employerAuthRepo.createOtp({
      establishmentId: establishment.id,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    return { establishmentId: establishment.id, devOtp: code };
  }

  async verifyOtp(
    establishmentCode: string,
    code: string,
  ): Promise<{ sessionId: string; establishment: EstablishmentRow }> {
    const establishment = await this.establishmentRepo.findByCode(this.normalizeCode(establishmentCode));
    if (!establishment) throw new InvalidEstablishmentCodeError();

    const otp = await this.employerAuthRepo.findLatestUnconsumedOtp(establishment.id);
    if (!otp || otp.code !== code || otp.expiresAt < new Date()) {
      throw new InvalidEmployerOtpError();
    }

    await this.employerAuthRepo.consumeOtp(otp.id);
    const session = await this.employerAuthRepo.createSession({
      establishmentId: establishment.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });

    return { sessionId: session.id, establishment };
  }

  async resolveSession(sessionId: string): Promise<EstablishmentRow> {
    const session = await this.employerAuthRepo.findSession(sessionId);
    if (!session || session.expiresAt < new Date()) throw new EmployerSessionExpiredError();

    const establishment = await this.establishmentRepo.findById(session.establishmentId);
    if (!establishment) throw new EmployerSessionExpiredError();
    return establishment;
  }

  async signOut(sessionId: string): Promise<void> {
    await this.employerAuthRepo.deleteSession(sessionId);
  }
}
