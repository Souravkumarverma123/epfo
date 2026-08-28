import { distinctFinancialYears, financialYearForMonth } from "@repo/domain";
import { EmploymentRepository, type EmploymentRow } from "../repositories/employment-repository";
import { ContributionRepository } from "../repositories/contribution-repository";
import { LedgerRepository } from "../repositories/ledger-repository";

export class NoEmploymentsError extends Error {
  constructor() {
    super("This member has no employment history yet");
    this.name = "NoEmploymentsError";
  }
}

export interface PassbookRow {
  type: "CONTRIBUTION" | "INTEREST";
  /** Real contribution month for CONTRIBUTION rows. For INTEREST rows, the
   *  FY-end month implied by the credit — used only for sorting/filtering,
   *  never shown as-is (the label is shown instead). */
  sortMonth: string;
  label: string;
  employeeSharePaise: bigint;
  employerSharePaise: bigint;
  pensionSharePaise: bigint;
  balanceAfterPaise: bigint;
}

export interface PassbookResult {
  employments: Array<{ id: string; employerName: string; isActive: boolean }>;
  financialYears: string[];
  selectedEmploymentId: string;
  selectedFinancialYear: string;
  rows: PassbookRow[];
}

/** Extracts the FY-end month (e.g. "2026-03") from our own seed/posting
 *  convention's interest reference text ("Interest for FY 2025-26 ..."),
 *  used only to place/filter the interest row on the same month axis as
 *  contributions. Returns null if the text doesn't match — the row is then
 *  excluded from FY filtering rather than guessed at. */
function interestSortMonth(reference: string | null): string | null {
  const match = reference?.match(/FY (\d{4})-\d{2}/);
  if (!match) return null;
  const fyStartYear = Number(match[1]);
  return `${fyStartYear + 1}-03`;
}

export class PassbookService {
  constructor(
    private readonly employmentRepo: EmploymentRepository,
    private readonly contributionRepo: ContributionRepository,
    private readonly ledgerRepo: LedgerRepository,
  ) {}

  async getPassbook(
    memberId: string,
    filter: { employmentId?: string; financialYear?: string },
  ): Promise<PassbookResult> {
    const employmentRows = await this.employmentRepo.listByMember(memberId);
    if (employmentRows.length === 0) throw new NoEmploymentsError();

    const selectedEmployment = this.resolveEmployment(employmentRows, filter.employmentId);
    const isCurrentEmployment = selectedEmployment.exitedOn === null;

    const ledgerRows = await this.ledgerRepo.listByMemberAndEmployment(
      memberId,
      selectedEmployment.id,
      isCurrentEmployment,
    );

    const contributionIds = ledgerRows
      .map((r) => r.contributionId)
      .filter((id): id is string => id !== null);
    const contributionRows = await this.contributionRepo.listByIds(contributionIds);
    const contributionById = new Map(contributionRows.map((c) => [c.id, c]));

    const allRows: PassbookRow[] = [];
    for (const entry of ledgerRows) {
      if (entry.type === "CONTRIBUTION" && entry.contributionId) {
        const contribution = contributionById.get(entry.contributionId);
        if (!contribution) continue;
        allRows.push({
          type: "CONTRIBUTION",
          sortMonth: contribution.month,
          label: contribution.month,
          employeeSharePaise: contribution.employeeSharePaise,
          employerSharePaise: contribution.employerSharePaise,
          pensionSharePaise: contribution.pensionSharePaise,
          balanceAfterPaise: entry.balanceAfterPaise,
        });
      } else if (entry.type === "INTEREST") {
        const sortMonth = interestSortMonth(entry.reference);
        if (!sortMonth) continue; // can't place it on the month axis — leave it out rather than guess
        allRows.push({
          type: "INTEREST",
          sortMonth,
          label: entry.reference ?? "Interest",
          employeeSharePaise: 0n,
          employerSharePaise: 0n,
          pensionSharePaise: 0n,
          balanceAfterPaise: entry.balanceAfterPaise,
        });
      }
    }

    const financialYears = distinctFinancialYears(allRows.map((r) => r.sortMonth));
    const selectedFinancialYear = filter.financialYear ?? financialYears[0] ?? "";

    const rows = allRows
      .filter((r) => financialYearForMonth(r.sortMonth) === selectedFinancialYear)
      .sort((a, b) => (a.sortMonth < b.sortMonth ? 1 : -1));

    return {
      employments: employmentRows.map((e) => ({
        id: e.id,
        employerName: e.employerName,
        isActive: e.exitedOn === null,
      })),
      financialYears,
      selectedEmploymentId: selectedEmployment.id,
      selectedFinancialYear,
      rows,
    };
  }

  private resolveEmployment(rows: EmploymentRow[], requestedId?: string): EmploymentRow {
    if (requestedId) {
      const match = rows.find((r) => r.id === requestedId);
      if (match) return match;
    }
    return rows.find((r) => r.exitedOn === null) ?? rows[0]!;
  }
}
