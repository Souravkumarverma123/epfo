import { eq, nominees } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type NomineeRow = typeof nominees.$inferSelect;
export type NewNomineeRow = typeof nominees.$inferInsert;

export class NomineeRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async listByMember(memberId: string): Promise<NomineeRow[]> {
    return this.executor.select().from(nominees).where(eq(nominees.memberId, memberId));
  }

  async create(data: NewNomineeRow): Promise<NomineeRow> {
    const [row] = await this.executor.insert(nominees).values(data).returning();
    if (!row) throw new Error("NomineeRepository.create: insert returned no row");
    return row;
  }
}
