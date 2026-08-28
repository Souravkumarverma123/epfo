import { and, desc, eq, isNull, otpCodes, sessions } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type OtpCodeRow = typeof otpCodes.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;

export class AuthRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async createOtp(data: {
    memberId: string;
    code: string;
    expiresAt: Date;
  }): Promise<OtpCodeRow> {
    const [row] = await this.executor.insert(otpCodes).values(data).returning();
    if (!row) throw new Error("AuthRepository.createOtp: insert returned no row");
    return row;
  }

  /** The most recent unconsumed code for this member, regardless of expiry —
   *  the service decides what to do with an expired one. */
  async findLatestUnconsumedOtp(memberId: string): Promise<OtpCodeRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.memberId, memberId), isNull(otpCodes.consumedAt)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return row;
  }

  async consumeOtp(otpId: string): Promise<void> {
    await this.executor
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(otpCodes.id, otpId));
  }

  async createSession(data: { memberId: string; expiresAt: Date }): Promise<SessionRow> {
    const [row] = await this.executor.insert(sessions).values(data).returning();
    if (!row) throw new Error("AuthRepository.createSession: insert returned no row");
    return row;
  }

  async findSession(sessionId: string): Promise<SessionRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    return row;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.executor.delete(sessions).where(eq(sessions.id, sessionId));
  }
}
