import { desc, employments, eq, members } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type EmploymentRow = typeof employments.$inferSelect;
export type NewEmploymentRow = typeof employments.$inferInsert;

/** One row of the employer dashboard's employee list — an employment joined
 *  to the member it belongs to. Not a domain entity of its own; just the
 *  shape EmployerService.getDashboard needs. */
export interface EmploymentWithMemberRow {
  employmentId: string;
  joinedOn: string;
  exitedOn: string | null;
  employmentStatus: string;
  memberId: string;
  fullName: string;
  uan: string;
  kycStatus: string;
}

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

  /** Every employment at this establishment code, each joined to the member
   *  it belongs to — this is how an employer's dashboard sees "its"
   *  employees without a retrofitted FK (see employer.ts's establishments
   *  table comment). */
  async listByEstablishmentCodeWithMember(establishmentCode: string): Promise<EmploymentWithMemberRow[]> {
    const rows = await this.executor
      .select({
        employmentId: employments.id,
        joinedOn: employments.joinedOn,
        exitedOn: employments.exitedOn,
        employmentStatus: employments.status,
        memberId: members.id,
        fullName: members.fullName,
        uan: members.uan,
        kycStatus: members.kycStatus,
      })
      .from(employments)
      .innerJoin(members, eq(employments.memberId, members.id))
      .where(eq(employments.establishmentCode, establishmentCode))
      .orderBy(desc(employments.joinedOn));
    return rows;
  }

  async create(data: NewEmploymentRow): Promise<EmploymentRow> {
    const [row] = await this.executor.insert(employments).values(data).returning();
    if (!row) throw new Error("EmploymentRepository.create: insert returned no row");
    return row;
  }
}
