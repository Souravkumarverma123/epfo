import { randomInt } from "node:crypto";
import {
  assertTransition,
  checkAmount,
  checkEligibility,
  formatClaimNumber,
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
import { IdempotencyRepository } from "../repositories/idempotency-repository";
import { OutboxRepository } from "../repositories/outbox-repository";
import type { Executor } from "../executor";
import type { TransactionCallback } from "../transaction";

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

  async getStatus(memberId: string, claimNumber: string): Promise<ClaimStatusResult> {
    const claim = await this.claimsRepo.findByClaimNumber(claimNumber);
    if (!claim || claim.memberId !== memberId) throw new ClaimNotFoundError();

    const transitions = await this.claimsRepo.listTransitions(claim.id);
    const currentStatus = claim.status as ClaimStatus;
    const timeline = HAPPY_PATH.map((status) => ({
      status,
      state: timelineStateFor(status, currentStatus),
    }));

    return { claim, transitions, timeline };
  }

  async listClaims(memberId: string): Promise<ClaimRow[]> {
    return this.claimsRepo.listByMember(memberId);
  }
}
