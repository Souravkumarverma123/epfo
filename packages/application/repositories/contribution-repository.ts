import { contributions, desc, eq } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type ContributionRow = typeof contributions.$inferSelect;
export type NewContributionRow = typeof contributions.$inferInsert;

export class ContributionRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async listByMember(memberId: string, limit = 100): Promise<ContributionRow[]> {
    return this.executor
      .select()
      .from(contributions)
      .where(eq(contributions.memberId, memberId))
      .orderBy(desc(contributions.month))
      .limit(limit);
  }

  async findLatestForMember(memberId: string): Promise<ContributionRow | undefined> {
    const [row] = await this.listByMember(memberId, 1);
    return row;
  }

  /**
   * Total employee + employer share contributed through one employment.
   * Deliberately excludes the pension (EPS) share — that accumulates
   * separately from the withdrawable PF balance in real EPFO accounting,
   * and our ledger follows the same rule (see LedgerRepository / seed.ts).
   */
  async sumWithdrawableByEmployment(employmentId: string): Promise<bigint> {
    const rows = await this.executor
      .select()
      .from(contributions)
      .where(eq(contributions.employmentId, employmentId));
    return rows.reduce((total, r) => total + r.employeeSharePaise + r.employerSharePaise, 0n);
  }

  async create(data: NewContributionRow): Promise<ContributionRow> {
    const [row] = await this.executor.insert(contributions).values(data).returning();
    if (!row) throw new Error("ContributionRepository.create: insert returned no row");
    return row;
  }
}
