import { and, desc, employerOtpCodes, employerSessions, eq, isNull } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type EmployerOtpCodeRow = typeof employerOtpCodes.$inferSelect;
export type EmployerSessionRow = typeof employerSessions.$inferSelect;

/** Mirrors AuthRepository exactly, one table set removed — see
 *  packages/database/models/employer.ts for why this is a separate table
 *  set rather than a shared one keyed by an "actor type" column. */
export class EmployerAuthRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async createOtp(data: {
    establishmentId: string;
    code: string;
    expiresAt: Date;
  }): Promise<EmployerOtpCodeRow> {
    const [row] = await this.executor.insert(employerOtpCodes).values(data).returning();
    if (!row) throw new Error("EmployerAuthRepository.createOtp: insert returned no row");
    return row;
  }

  async findLatestUnconsumedOtp(establishmentId: string): Promise<EmployerOtpCodeRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(employerOtpCodes)
      .where(and(eq(employerOtpCodes.establishmentId, establishmentId), isNull(employerOtpCodes.consumedAt)))
      .orderBy(desc(employerOtpCodes.createdAt))
      .limit(1);
    return row;
  }

  async consumeOtp(otpId: string): Promise<void> {
    await this.executor
      .update(employerOtpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(employerOtpCodes.id, otpId));
  }

  async createSession(data: { establishmentId: string; expiresAt: Date }): Promise<EmployerSessionRow> {
    const [row] = await this.executor.insert(employerSessions).values(data).returning();
    if (!row) throw new Error("EmployerAuthRepository.createSession: insert returned no row");
    return row;
  }

  async findSession(sessionId: string): Promise<EmployerSessionRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(employerSessions)
      .where(eq(employerSessions.id, sessionId))
      .limit(1);
    return row;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.executor.delete(employerSessions).where(eq(employerSessions.id, sessionId));
  }
}
