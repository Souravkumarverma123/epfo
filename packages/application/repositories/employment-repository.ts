import { desc, employments, eq } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type EmploymentRow = typeof employments.$inferSelect;
export type NewEmploymentRow = typeof employments.$inferInsert;

export class EmploymentRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async listByMember(memberId: string): Promise<EmploymentRow[]> {
    return this.executor
      .select()
      .from(employments)
      .where(eq(employments.memberId, memberId))
      .orderBy(desc(employments.joinedOn));
  }

  async create(data: NewEmploymentRow): Promise<EmploymentRow> {
    const [row] = await this.executor.insert(employments).values(data).returning();
    if (!row) throw new Error("EmploymentRepository.create: insert returned no row");
    return row;
  }
}
