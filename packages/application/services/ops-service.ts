import { formatClaimNumber } from "@repo/domain";
import { AuditRepository, type AuditLogRow } from "../repositories/audit-repository";
import { ClaimsRepository, type ClaimRow, type ClaimTransitionRow } from "../repositories/claims-repository";
import { DependencyRepository, type DependencyStateRow } from "../repositories/dependency-repository";
import { LedgerRepository } from "../repositories/ledger-repository";
import { MemberRepository } from "../repositories/member-repository";
import { OutboxRepository, type OutboxEventRow } from "../repositories/outbox-repository";
import { ClaimNotFoundError, type ClaimsService } from "./claims-service";

export type SearchKind = "claimNumber" | "uan" | "operationId" | "unknown";

export interface OpsSearchResult {
  kind: SearchKind;
  claims: ClaimRow[];
}

export interface OpsOverview {
  dependencies: DependencyStateRow[];
  claimsByStatus: Array<{ status: string; count: number }>;
  outboxByStatus: Array<{ status: string; count: number }>;
  stuckClaims: ClaimRow[];
  recentClaims: ClaimRow[];
  latencyMs: { p50: number | null; p95: number | null };
  reconciliation: ReconciliationReport;
}

export interface OpsClaimDetail {
  claim: ClaimRow;
  transitions: ClaimTransitionRow[];
  audit: AuditLogRow[];
  outbox: OutboxEventRow[];
  /** Audit rows sharing this claim's operation ID but hanging off another
   *  resource — the ledger debit, most importantly. */
  relatedAudit: AuditLogRow[];
}

export interface ReconciliationReport {
  membersChecked: number;
  discrepancies: Array<{
    memberId: string;
    derivedBalancePaise: bigint;
    ledgerBalancePaise: bigint;
    differencePaise: bigint;
  }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UAN_RE = /^\d{12}$/;

/**
 * The operations/admin read model (PRD §36, §37).
 *
 * Everything here is a *read* over state the citizen-facing path already
 * committed — this service owns no business rules and decides nothing. That
 * separation is the point: if the ops console could compute its own view of
 * a claim, it would no longer be evidence of what the system actually did.
 * The single exception is `retryClaim`, which delegates straight back to
 * ClaimsService rather than transitioning anything itself.
 */
export class OpsService {
  constructor(
    private readonly claimsRepo: ClaimsRepository,
    private readonly auditRepo: AuditRepository,
    private readonly outboxRepo: OutboxRepository,
    private readonly dependencyRepo: DependencyRepository,
    private readonly ledgerRepo: LedgerRepository,
    private readonly memberRepo: MemberRepository,
    private readonly claimsService: ClaimsService,
  ) {}

  async overview(): Promise<OpsOverview> {
    const [
      dependencies,
      claimsByStatus,
      outboxByStatus,
      stuckClaims,
      recentClaims,
      latencyMs,
      reconciliation,
    ] = await Promise.all([
      this.dependencyRepo.listAll(),
      this.claimsRepo.countByStatus(),
      this.outboxRepo.countByStatus(),
      this.claimsRepo.listStuck(),
      this.claimsRepo.listRecent(10),
      this.claimsRepo.submissionLatencyMs(),
      this.reconcile(),
    ]);

    return {
      dependencies,
      claimsByStatus,
      outboxByStatus,
      stuckClaims,
      recentClaims,
      latencyMs,
      reconciliation,
    };
  }

  /**
   * PRD §36: "Claim search by claim ID, UAN or operation ID". The three are
   * distinguishable by shape, so the operator gets one box rather than a
   * dropdown they have to get right before the search will work.
   */
  async search(rawQuery: string): Promise<OpsSearchResult> {
    const query = rawQuery.trim();
    if (!query) return { kind: "unknown", claims: [] };

    if (UUID_RE.test(query)) {
      const claim = await this.claimsRepo.findByOperationId(query);
      return { kind: "operationId", claims: claim ? [claim] : [] };
    }

    if (UAN_RE.test(query)) {
      const member = await this.memberRepo.findByUan(query);
      if (!member) return { kind: "uan", claims: [] };
      return { kind: "uan", claims: await this.claimsRepo.listByMember(member.id) };
    }

    // Accept "EPFO-928311", "epfo-928311" and a bare "928311" alike — an
    // operator reading a number off a phone call shouldn't have to know the
    // canonical form.
    const digits = query.replace(/\D/g, "");
    const claimNumber = digits ? formatClaimNumber(digits) : query.toUpperCase();
    const claim = await this.claimsRepo.findByClaimNumber(claimNumber);
    return { kind: "claimNumber", claims: claim ? [claim] : [] };
  }

  /** PRD §47 step 12: one operation ID, the whole end-to-end trace. */
  async claimDetail(claimId: string): Promise<OpsClaimDetail> {
    const claim = await this.claimsRepo.findById(claimId);
    if (!claim) throw new ClaimNotFoundError();

    const [transitions, audit, outbox, byOperation] = await Promise.all([
      this.claimsRepo.listTransitions(claim.id),
      this.auditRepo.listByResource("claim", claim.id),
      this.outboxRepo.listByAggregate("claim", claim.id),
      this.auditRepo.listByOperation(claim.operationId),
    ]);

    return {
      claim,
      transitions,
      audit,
      outbox,
      relatedAudit: byOperation.filter((row) => row.resourceType !== "claim"),
    };
  }

  /** PRD §12/§34/§48: derived balance vs the ledger it is derived from. */
  async reconcile(): Promise<ReconciliationReport> {
    const rows = await this.ledgerRepo.reconcileBalances();
    return {
      membersChecked: rows.length,
      discrepancies: rows
        .filter((r) => r.derivedBalancePaise !== r.ledgerBalancePaise)
        .map((r) => ({
          memberId: r.memberId,
          derivedBalancePaise: r.derivedBalancePaise,
          ledgerBalancePaise: r.ledgerBalancePaise,
          differencePaise: r.derivedBalancePaise - r.ledgerBalancePaise,
        })),
    };
  }

  /**
   * PRD §36: "retry/recovery controls with authorization". The retry itself
   * is ClaimsService's — this only records who asked for it, then delegates.
   * An operator-triggered retry that a dependency still blocks simply leaves
   * the claim where it was, which is the correct outcome and is visible in
   * the audit trail either way.
   */
  async retryClaim(claimId: string, actorId: string): Promise<ClaimRow> {
    const before = await this.claimsRepo.findById(claimId);
    if (!before) throw new ClaimNotFoundError();

    await this.auditRepo.record({
      actorType: "OFFICER",
      actorId,
      action: "claim.retry.requested",
      resourceType: "claim",
      resourceId: claimId,
      beforeState: { status: before.status, retryingStep: before.reasonCode },
      reason: "Manual retry from the operations console",
      operationId: before.operationId,
    });

    return this.claimsService.advanceIfDue(claimId, new Date(), { force: true });
  }
}
