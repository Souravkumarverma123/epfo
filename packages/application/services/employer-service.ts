import { EmploymentRepository, type EmploymentWithMemberRow } from "../repositories/employment-repository";
import type { EstablishmentRow } from "../repositories/establishment-repository";

export interface EmployerDashboard {
  establishment: EstablishmentRow;
  employees: EmploymentWithMemberRow[];
  activeCount: number;
  pendingKycCount: number;
}

/**
 * Employer-side read model. View-only by design (see the scoping decision
 * this feature was built under): real establishment + real employee list,
 * pulled from the same `employments`/`members` rows the citizen side
 * already writes — nothing here is fabricated, and nothing here changes
 * state yet. No ECR filing / challans / KYC-approval actions exist in this
 * prototype; the dashboard says so plainly rather than showing sample
 * numbers for them.
 */
export class EmployerService {
  constructor(private readonly employmentRepo: EmploymentRepository) {}

  async getDashboard(establishment: EstablishmentRow): Promise<EmployerDashboard> {
    const employees = await this.employmentRepo.listByEstablishmentCodeWithMember(
      establishment.establishmentCode,
    );
    return {
      establishment,
      employees,
      activeCount: employees.filter((e) => e.employmentStatus === "ACTIVE").length,
      pendingKycCount: employees.filter((e) => e.kycStatus !== "VERIFIED").length,
    };
  }
}
