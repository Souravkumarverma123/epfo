import {
  computeMemberTasks,
  toYearsAndMonths,
  totalServiceMonths,
  type MemberTask,
} from "@repo/domain";
import { MemberRepository, type MemberRow } from "../repositories/member-repository";
import { EmploymentRepository, type EmploymentRow } from "../repositories/employment-repository";
import { ContributionRepository } from "../repositories/contribution-repository";
import { LedgerRepository } from "../repositories/ledger-repository";

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found");
    this.name = "MemberNotFoundError";
  }
}

export interface EmploymentSummary {
  employment: EmploymentRow;
  /** Employee + employer share contributed through this employment (excludes pension/EPS share). */
  contributedPaise: bigint;
}

export interface DashboardSummary {
  member: MemberRow;
  totalBalancePaise: bigint;
  lastContribution: { amountPaise: bigint; month: string; onTime: boolean } | null;
  latestInterestCredit: { amountPaise: bigint; reference: string | null } | null;
  employments: EmploymentSummary[];
  pensionService: { years: number; months: number };
  tasks: MemberTask[];
}

/**
 * Assembles the dashboard view. This class makes no decisions of its own —
 * eligibility/task rules live in @repo/domain, persistence lives in the
 * repositories. This is purely orchestration, which is what makes it easy to
 * unit test against fake repositories later.
 */
export class MemberService {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly employmentRepo: EmploymentRepository,
    private readonly contributionRepo: ContributionRepository,
    private readonly ledgerRepo: LedgerRepository,
  ) {}

  async getDashboardSummary(memberId: string, now: Date = new Date()): Promise<DashboardSummary> {
    const member = await this.memberRepo.findById(memberId);
    if (!member) throw new MemberNotFoundError();

    const [balance, employmentRows, latestContribution, latestInterest] = await Promise.all([
      this.ledgerRepo.getBalance(memberId),
      this.employmentRepo.listByMember(memberId),
      this.contributionRepo.findLatestForMember(memberId),
      this.ledgerRepo.findLatestByType(memberId, "INTEREST"),
    ]);

    const employments: EmploymentSummary[] = await Promise.all(
      employmentRows.map(async (employment) => ({
        employment,
        contributedPaise: await this.contributionRepo.sumWithdrawableByEmployment(employment.id),
      })),
    );

    const pensionMonths = totalServiceMonths(
      employmentRows.map((e) => ({ joinedOn: e.joinedOn, exitedOn: e.exitedOn })),
      now,
    );

    return {
      member,
      totalBalancePaise: balance?.currentBalancePaise ?? 0n,
      lastContribution: latestContribution
        ? {
            amountPaise: latestContribution.employeeSharePaise + latestContribution.employerSharePaise,
            month: latestContribution.month,
            onTime: latestContribution.status !== "LATE",
          }
        : null,
      latestInterestCredit: latestInterest
        ? { amountPaise: latestInterest.amountPaise, reference: latestInterest.reference }
        : null,
      employments,
      pensionService: toYearsAndMonths(pensionMonths),
      tasks: computeMemberTasks({ maskedPan: member.maskedPan }),
    };
  }
}
