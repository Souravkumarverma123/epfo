import { eq, members } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type MemberRow = typeof members.$inferSelect;
export type NewMemberRow = typeof members.$inferInsert;

export class MemberRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async findById(memberId: string): Promise<MemberRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);
    return row;
  }

  /** UAN is the login handle — callers should normalize (strip spaces) before calling this. */
  async findByUan(uan: string): Promise<MemberRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(members)
      .where(eq(members.uan, uan))
      .limit(1);
    return row;
  }

  async create(data: NewMemberRow): Promise<MemberRow> {
    const [row] = await this.executor.insert(members).values(data).returning();
    if (!row) throw new Error("MemberRepository.create: insert returned no row");
    return row;
  }
}
