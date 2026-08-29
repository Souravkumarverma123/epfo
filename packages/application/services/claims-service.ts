import { randomInt } from "node:crypto";
import {
  assertTransition,
  checkAmount,
  checkEligibility,
  dependencyGateFor,
  formatClaimNumber,
  isTerminal,
  nextHappyPathStatus,
  timelineStateFor,
  totalServiceMonths,
  HAPPY_PATH,
  type AdvancePurpose,
  type ClaimStatus,
  type ClaimType,
  type EligibilityContext,
  type EligibilityResult,
} from "@repo/domain";
import { EmploymentRepository } from "../repositories/employment-repository";
import { ContributionRepository } from "../repositories/contribution-repository";
import { LedgerRepository } from "../repositories/ledger-repository";
import { ClaimsRepository, type ClaimRow, type ClaimTransitionRow } from "../repositories/claims-repository";
import { AuditRepository } from "../repositories/audit-repository";
import { IdempotencyRepository } from "../repositories/idempotency-repository";
import { OutboxRepository } from "../repositories/outbox-repository";
import { DependencyRepository } from "../repositories/dependency-repository";
import type { Executor } from "../executor";
import type { TransactionCallback } from "../transaction";

/** How long a claim sits at one step before the next poll is allowed to
 *  advance it — long enough to watch on screen, short enough for a live
 *  demo. This stands in for Inngest's step scheduling (PRD Phase 4,
 *  documented as not built): advancing on each status poll instead of a
 *  background worker is a deliberate fit for a serverless deploy target,
 *  where a long-running process isn't available anyway. */
const STEP_INTERVAL_MS = 4000;

export class ClaimNotFoundError extends Error {
  constructor() {
    super("Claim not found");
    this.name = "ClaimNotFoundError";
  }
}

export class ClaimRejectedError extends Error {
  constructor(public readonly reasons: string[]) {
    super(`Claim would be rejected: ${reasons.join(", ")}`);
    this.name = "ClaimRejectedError";
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("This idempotency key was already used for a different request");
    this.name = "IdempotencyConflictError";
  }
}

export class RequestInProgressError extends Error {
  constructor() {
    super("This request is already being processed — please wait");
    this.name = "RequestInProgressError";
  }
}

export interface SubmitClaimInput {
  memberId: string;
  type: ClaimType;
  purpose?: AdvancePurpose;
  amountPaise: bigint;
  idempotencyKey: string;
}

export interface SubmitClaimResult {
  claim: ClaimRow;
  /** True if this exact request (same idempotency key + body) had already
   *  completed and we're returning the stored result, not doing it again. */
  replayed: boolean;
}

export interface ClaimStatusResult {
  claim: ClaimRow;
  transitions: ClaimTransitionRow[];
  timeline: Array<{ status: ClaimStatus; state: "done" | "active" | "pending" }>;
}

/**
 * Orchestrates claim creation. Every decision (is this member eligible, is
 * this transition legal) is delegated to @repo/domain's pure functions —
 * this class's job is wiring repositories together and enforcing the
 * transaction/idempotency boundaries (PRD §16, §17), not deciding anything
 * itself.
 */
export class ClaimsService {
  constructor(
    private readonly employmentRepo: EmploymentRepository,
    private readonly contributionRepo: ContributionRepository,
    private readonly ledgerRepo: LedgerRepository,
    private readonly claimsRepo: ClaimsRepository,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly outboxRepo: OutboxRepository,
    private readonly dependencyRepo: DependencyRepository,
    private readonly auditRepo: AuditRepository,
    private readonly withTransaction: <T>(cb: TransactionCallback<T>) => Promise<T>,
  ) {}

  private async buildEligibilityContext(memberId: string, now: Date): Promise<EligibilityContext> {
    const [balance, employmentRows, employeeSharePaise] = await Promise.all([
      this.ledgerRepo.getBalance(memberId),
      this.employmentRepo.listByMember(memberId),
      this.contributionRepo.sumEmployeeShareForMember(memberId),
    ]);

    const activeEmployment = employmentRows.find((e) => e.exitedOn === null);
    const hasExited = !activeEmployment;
    const mostRecentExit = employmentRows
      .map((e) => e.exitedOn)
      .filter((d): d is string => d !== null)
      .sort()
      .pop();

    let monthsSinceExit = 0;
    if (hasExited && mostRecentExit) {
      const exitDate = new Date(mostRecentExit);
      monthsSinceExit =
        (now.getFullYear() - exitDate.getFullYear()) * 12 + (now.getMonth() - exitDate.getMonth());
    }

    const serviceMonths = totalServiceMonths(
      employmentRows.map((e) => ({ joinedOn: e.joinedOn, exitedOn: e.exitedOn })),
      now,
    );

    return {
      totalBalancePaise: balance?.currentBalancePaise ?? 0n,
      employeeSharePaise,
      serviceYears: serviceMonths / 12,
      hasExited,
      monthsSinceExit: Math.max(0, monthsSinceExit),
    };
  }

  async checkEligibility(
    memberId: string,
    type: ClaimType,
    purpose?: AdvancePurpose,
    now: Date = new Date(),
  ): Promise<EligibilityResult> {
    const ctx = await this.buildEligibilityContext(memberId, now);
    return checkEligibility(type, ctx, purpose);
  }

  /**
   * Create and submit a claim. Idempotent (PRD §16): calling this five
   * times with the same `idempotencyKey` and the same claim details
   * produces exactly one claim — the second through fifth calls replay the
   * first's result instead of creating anything.
   */
  async submitClaim(input: SubmitClaimInput, now: Date = new Date()): Promise<SubmitClaimResult> {
    const requestHash = JSON.stringify({
      type: input.type,
      purpose: input.purpose ?? null,
      amountPaise: input.amountPaise.toString(),
    });

    const begin = await this.idempotencyRepo.begin({
      actorId: input.memberId,
      operation: "submitClaim",
      key: input.idempotencyKey,
      requestHash,
      ttlMs: 24 * 60 * 60 * 1000,
    });

    if (begin.outcome === "conflict") throw new IdempotencyConflictError();
    if (begin.outcome === "in_progress") throw new RequestInProgressError();
    if (begin.outcome === "completed") {
      const claimId = (begin.response as { claimId: string }).claimId;
      const claim = await this.claimsRepo.findById(claimId);
      if (!claim) throw new ClaimNotFoundError();
      // The duplicate-submission proof (PRD §47 step 10) is only worth much
      // if the absorbed attempts are visible somewhere afterwards. They are:
      // one audit row per replay, all carrying the original operation ID, so
      // "submitted five times, one claim" is a thing an operator can read
      // back rather than a claim we just make on stage.
      await this.auditRepo.record({
        actorType: "CITIZEN",
        actorId: input.memberId,
        action: "claim.submit.replayed",
        resourceType: "claim",
        resourceId: claim.id,
        reason: "Idempotency key already completed — returned the original claim",
        operationId: claim.operationId,
      });
      return { claim, replayed: true };
    }

    // Server re-validates eligibility — the client's number is never trusted.
    const eligibility = await this.checkEligibility(input.memberId, input.type, input.purpose, now);
    const amountCheck = checkAmount(input.amountPaise, eligibility);
    if (!amountCheck.ok) throw new ClaimRejectedError([amountCheck.reason ?? "INELIGIBLE"]);

    const claimNumber = formatClaimNumber(String(randomInt(100000, 999999)));

    const claim = await this.withTransaction(async (tx) => {
      const claimsRepo = new ClaimsRepository(tx as Executor);
      const outboxRepo = new OutboxRepository(tx as Executor);
      const auditRepo = new AuditRepository(tx as Executor);
      const operationId = crypto.randomUUID();

      const created = await claimsRepo.create({
        claimNumber,
        memberId: input.memberId,
        type: input.type,
        purpose: input.purpose ?? null,
        amountPaise: input.amountPaise,
        status: "DRAFT",
        version: 0,
        operationId,
      });
      await claimsRepo.insertTransition({
        claimId: created.id,
        fromStatus: null,
        toStatus: "DRAFT",
        actorType: "CITIZEN",
        actorId: input.memberId,
      });

      assertTransition("DRAFT", "SUBMITTED");
      const submitted = await claimsRepo.updateStatus({
        claimId: created.id,
        expectedVersion: created.version,
        toStatus: "SUBMITTED",
        submittedAt: now,
      });
      await claimsRepo.insertTransition({
        claimId: created.id,
        fromStatus: "DRAFT",
        toStatus: "SUBMITTED",
        actorType: "CITIZEN",
        actorId: input.memberId,
      });

      // Transactional outbox (PRD §17): committed atomically with the claim
      // itself, in the same transaction — there is no window where the
      // claim exists but this event was lost.
      await outboxRepo.insert({
        eventType: "epfo/claim.submitted",
        aggregateType: "claim",
        aggregateId: created.id,
        payload: {
          claimId: created.id,
          claimNumber,
          memberId: input.memberId,
          type: input.type,
          amountPaise: input.amountPaise.toString(),
          operationId,
        },
      });

      // Audit in the same transaction as the state change it describes
      // (PRD §25): if the claim commits, its audit row commits with it.
      await auditRepo.record({
        actorType: "CITIZEN",
        actorId: input.memberId,
        action: "claim.submitted",
        resourceType: "claim",
        resourceId: created.id,
        afterState: {
          claimNumber,
          type: input.type,
          purpose: input.purpose ?? null,
          amountPaise: input.amountPaise.toString(),
          status: "SUBMITTED",
        },
        operationId,
      });

      return submitted;
    });

    await this.idempotencyRepo.complete({
      actorId: input.memberId,
      operation: "submitClaim",
      key: input.idempotencyKey,
      response: { claimId: claim.id },
    });

    return { claim, replayed: false };
  }

  /**
   * Advance a claim by at most one step, if it's due (PRD §14 stand-in —
   * see STEP_INTERVAL_MS). Every legal transition here still goes through
   * @repo/domain's `assertTransition`, so this can never put a claim in a
   * state the state machine wouldn't otherwise allow — it's just what
   * *decides* to call it, standing in for a workflow engine.
   *
   * Recovery works the same way real retries do: a step's dependency is
   * remembered in `reasonCode` while the claim sits at FAILED_RETRYABLE, so
   * the next call re-attempts exactly that step rather than starting over.
   */
  async advanceIfDue(
    claimId: string,
    now: Date = new Date(),
    options: { force?: boolean } = {},
  ): Promise<ClaimRow> {
    const claim = await this.claimsRepo.findById(claimId);
    if (!claim) throw new ClaimNotFoundError();

    const status = claim.status as ClaimStatus;
    if (isTerminal(status)) return claim;
    // `force` is the operator's "retry now" (PRD §36): it skips the demo
    // pacing interval, nothing else. Every guard that actually matters —
    // the state machine, the dependency gate, optimistic concurrency —
    // still applies, so a retry cannot push a claim somewhere a normal
    // poll couldn't have taken it.
    if (!options.force && now.getTime() - claim.updatedAt.getTime() < STEP_INTERVAL_MS) return claim;

    // While recovering, we're really still trying to clear the step that
    // failed — remembered in reasonCode when we entered FAILED_RETRYABLE.
    const attemptingStatus: ClaimStatus =
      status === "FAILED_RETRYABLE" ? (claim.reasonCode as ClaimStatus) : status;

    const gate = dependencyGateFor(attemptingStatus);
    if (gate) {
      const mode = await this.dependencyRepo.getMode(gate);
      if (mode !== "UP") {
        if (status !== "FAILED_RETRYABLE") {
          assertTransition(status, "FAILED_RETRYABLE");
          const failed = await this.claimsRepo.updateStatus({
            claimId,
            expectedVersion: claim.version,
            toStatus: "FAILED_RETRYABLE",
            reasonCode: attemptingStatus,
            reasonDetail: `Waiting on ${gate} — currently ${mode}`,
          });
          await this.claimsRepo.insertTransition({
            claimId,
            fromStatus: status,
            toStatus: "FAILED_RETRYABLE",
            actorType: "SYSTEM",
            note: `${gate} dependency is ${mode}`,
          });
          await this.auditRepo.record({
            actorType: "SYSTEM",
            action: "claim.held",
            resourceType: "claim",
            resourceId: claimId,
            beforeState: { status },
            afterState: { status: "FAILED_RETRYABLE", retryingStep: attemptingStatus },
            reason: `${gate} dependency is ${mode}`,
            operationId: claim.operationId,
          });
          return failed;
        }
        return claim; // still down — nothing changes, we'll check again next poll
      }
    }

    // Coming back from a recorded failure: first move back onto the happy
    // path at the step we were attempting, so the next poll's dependency
    // check (now passing) is what actually advances further. Two visible
    // steps instead of silently jumping ahead.
    if (status === "FAILED_RETRYABLE") {
      assertTransition(status, attemptingStatus);
      const resumed = await this.claimsRepo.updateStatus({
        claimId,
        expectedVersion: claim.version,
        toStatus: attemptingStatus,
        reasonCode: null,
        reasonDetail: null,
      });
      await this.claimsRepo.insertTransition({
        claimId,
        fromStatus: status,
        toStatus: attemptingStatus,
        actorType: "SYSTEM",
        note: gate ? `${gate} dependency recovered — resuming` : "Resuming",
      });
      await this.auditRepo.record({
        actorType: "SYSTEM",
        action: "claim.resumed",
        resourceType: "claim",
        resourceId: claimId,
        beforeState: { status, retryingStep: attemptingStatus },
        afterState: { status: attemptingStatus },
        reason: gate ? `${gate} dependency recovered` : "Recovered",
        operationId: claim.operationId,
      });
      return resumed;
    }

    const next = nextHappyPathStatus(status);
    if (!next) return claim;

    assertTransition(status, next);

    if (next === "COMPLETED") {
      // Completion is also a financial event: the claim amount actually
      // leaves the member's balance here, in the same transaction as the
      // status change — same discipline as every other ledger write.
      return this.withTransaction(async (tx) => {
        const claimsRepo = new ClaimsRepository(tx as Executor);
        const ledgerRepo = new LedgerRepository(tx as Executor);
        const auditRepo = new AuditRepository(tx as Executor);
        const transactionId = crypto.randomUUID();

        await ledgerRepo.postEntry({
          memberId: claim.memberId,
          transactionId,
          type: "WITHDRAWAL",
          direction: "DEBIT",
          amountPaise: claim.amountPaise,
          reference: `Claim ${claim.claimNumber} completed`,
        });
        // The financially significant one (PRD §25). Same transaction as the
        // debit itself, so an audit row exists for every debit and only for
        // debits that actually committed.
        await auditRepo.record({
          actorType: "SYSTEM",
          action: "ledger.debited",
          resourceType: "member",
          resourceId: claim.memberId,
          afterState: {
            transactionId,
            type: "WITHDRAWAL",
            direction: "DEBIT",
            amountPaise: claim.amountPaise.toString(),
            claimNumber: claim.claimNumber,
          },
          reason: `Claim ${claim.claimNumber} completed`,
          operationId: claim.operationId,
        });

        const completed = await claimsRepo.updateStatus({
          claimId,
          expectedVersion: claim.version,
          toStatus: "COMPLETED",
          completedAt: now,
        });
        await claimsRepo.insertTransition({
          claimId,
          fromStatus: status,
          toStatus: "COMPLETED",
          actorType: "SYSTEM",
        });
        await auditRepo.record({
          actorType: "SYSTEM",
          action: "claim.transitioned",
          resourceType: "claim",
          resourceId: claimId,
          beforeState: { status },
          afterState: { status: "COMPLETED" },
          operationId: claim.operationId,
        });
        return completed;
      });
    }

    const advanced = await this.claimsRepo.updateStatus({
      claimId,
      expectedVersion: claim.version,
      toStatus: next,
    });
    await this.claimsRepo.insertTransition({
      claimId,
      fromStatus: status,
      toStatus: next,
      actorType: "SYSTEM",
    });
    await this.auditRepo.record({
      actorType: "SYSTEM",
      action: "claim.transitioned",
      resourceType: "claim",
      resourceId: claimId,
      beforeState: { status },
      afterState: { status: next },
      operationId: claim.operationId,
    });
    return advanced;
  }

  async getStatus(memberId: string, claimNumber: string): Promise<ClaimStatusResult> {
    const found = await this.claimsRepo.findByClaimNumber(claimNumber);
    if (!found || found.memberId !== memberId) throw new ClaimNotFoundError();

    const claim = await this.advanceIfDue(found.id);
    const transitions = await this.claimsRepo.listTransitions(claim.id);
    const currentStatus = claim.status as ClaimStatus;

    // FAILED_RETRYABLE/ACTION_REQUIRED aren't on HAPPY_PATH, so plugging
    // them straight into timelineStateFor would blank every step back to
    // "pending" — exactly the wrong look for "your claim is safe, we're
    // still working on it". Show progress against the step it's actually
    // retrying (remembered in reasonCode) instead, so earlier steps stay
    // "done" and that one step reads as "active".
    const timelineStatus: ClaimStatus =
      (currentStatus === "FAILED_RETRYABLE" || currentStatus === "ACTION_REQUIRED") && claim.reasonCode
        ? (claim.reasonCode as ClaimStatus)
        : currentStatus;

    const timeline = HAPPY_PATH.map((status) => ({
      status,
      state: timelineStateFor(status, timelineStatus),
    }));

    return { claim, transitions, timeline };
  }

  async listClaims(memberId: string): Promise<ClaimRow[]> {
    return this.claimsRepo.listByMember(memberId);
  }
}
