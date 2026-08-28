/**
 * Seed for the login + dashboard + passbook demo. Covers one member (Ananya
 * Rao) with three employments, real monthly contributions on the current
 * one across two financial years, and lump-sum ledger entries for the
 * earlier two (documented below).
 *
 * `postLedgerEntry` here mirrors
 * packages/application/repositories/ledger-repository.ts's `postEntry`
 * exactly (same FOR UPDATE + sequence-number logic, ADR-002, and the same
 * employmentId/contributionId columns the passbook joins against). It's
 * duplicated rather than imported because packages/database cannot depend
 * on @repo/application — @repo/application already depends on
 * @repo/database, and pnpm's workspace resolution does not allow the
 * reverse edge. If the real posting logic changes, update both.
 */
import "dotenv/config";
import { db } from "./index";
import { members, memberBalances, employments, contributions, ledgerEntries } from "./schema";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema";

type Tx = Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0];

async function postLedgerEntry(
  tx: Tx,
  entry: {
    memberId: string;
    transactionId: string;
    type: string;
    direction: "CREDIT" | "DEBIT";
    amountPaise: bigint;
    reference?: string;
    employmentId?: string;
    contributionId?: string;
  },
) {
  const [balanceRow] = await tx
    .select()
    .from(memberBalances)
    .where(eq(memberBalances.memberId, entry.memberId))
    .for("update")
    .limit(1);
  if (!balanceRow) throw new Error(`postLedgerEntry: no member_balances row for ${entry.memberId}`);

  const delta = entry.direction === "CREDIT" ? entry.amountPaise : -entry.amountPaise;
  const newBalance = balanceRow.currentBalancePaise + delta;
  const nextSequence = balanceRow.lastSequenceNumber + 1;

  await tx.insert(ledgerEntries).values({
    memberId: entry.memberId,
    sequenceNumber: nextSequence,
    transactionId: entry.transactionId,
    type: entry.type,
    direction: entry.direction,
    amountPaise: entry.amountPaise,
    balanceAfterPaise: newBalance,
    reference: entry.reference,
    employmentId: entry.employmentId,
    contributionId: entry.contributionId,
  });

  await tx
    .update(memberBalances)
    .set({ currentBalancePaise: newBalance, lastSequenceNumber: nextSequence, updatedAt: new Date() })
    .where(eq(memberBalances.memberId, entry.memberId));
}

async function seed() {
  const uan = "100234567890";

  const existing = await db.select().from(members).where(eq(members.uan, uan)).limit(1);
  if (existing.length > 0) {
    console.log(`Member with UAN ${uan} already exists, skipping.`);
    return;
  }

  const [member] = await db
    .insert(members)
    .values({
      uan,
      fullName: "Ananya Rao",
      dateOfBirth: "1993-02-07",
      maskedAadhaar: "XXXX-XXXX-6612",
      maskedPan: null, // deliberately missing -> drives the "Add your PAN" task
      mobile: "+919876548821",
      email: "ananya.rao@example.in",
      bankAccountMasked: "XXXXXXXX4471",
      bankIfsc: "SBIN0004512",
      kycStatus: "VERIFIED",
    })
    .returning();
  if (!member) throw new Error("seed: member insert returned no row");

  await db.insert(memberBalances).values({
    memberId: member.id,
    currentBalancePaise: 0n,
    lastSequenceNumber: 0,
  });

  const [current, kaveri, sunfield] = await db
    .insert(employments)
    .values([
      {
        memberId: member.id,
        employerName: "Northline Systems Pvt Ltd",
        establishmentCode: "BGBNG00456780000123",
        joinedOn: "2022-04-01",
        exitedOn: null,
        status: "ACTIVE",
      },
      {
        memberId: member.id,
        employerName: "Kaveri Retail Ltd",
        establishmentCode: "BGBNG00398210000456",
        joinedOn: "2018-07-01",
        exitedOn: "2022-03-31",
        status: "EXITED",
      },
      {
        memberId: member.id,
        employerName: "Sunfield Tech LLP",
        establishmentCode: "BGBNG00287650000789",
        joinedOn: "2016-08-01",
        exitedOn: "2018-06-30",
        status: "EXITED",
      },
    ])
    .returning();
  if (!current || !kaveri || !sunfield) throw new Error("seed: employment insert returned no rows");

  // Current employment: real monthly contributions across two financial
  // years (FY2025-26 Jan-Mar, FY2026-27 Apr-Jul), each individually posted
  // to the ledger — employee + employer share only. The pension/EPS share
  // accumulates separately; it is never part of the withdrawable PF balance
  // (PRD §12 amendment). Flat amounts every month is a simplification (no
  // raises modelled) — fine for a demo, not a claim of realism.
  const EMPLOYEE_SHARE = 7_200_00n;
  const EMPLOYER_SHARE = 4_950_00n;
  const PENSION_SHARE = 1_250_00n;
  const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

  for (const month of months) {
    const [contribution] = await db
      .insert(contributions)
      .values({
        memberId: member.id,
        employmentId: current.id,
        month,
        employeeSharePaise: EMPLOYEE_SHARE,
        employerSharePaise: EMPLOYER_SHARE,
        pensionSharePaise: PENSION_SHARE,
        postedOn: new Date(`${month}-25`),
        status: "POSTED",
        reference: `ECR-${month}`,
      })
      .returning();
    if (!contribution) throw new Error(`seed: contribution insert returned no row for ${month}`);

    await db.transaction((tx) =>
      postLedgerEntry(tx, {
        memberId: member.id,
        transactionId: crypto.randomUUID(),
        type: "CONTRIBUTION",
        direction: "CREDIT",
        amountPaise: EMPLOYEE_SHARE + EMPLOYER_SHARE,
        reference: `${current.employerName} — ${month}`,
        employmentId: current.id,
        contributionId: contribution.id,
      }),
    );
  }

  // FY2025-26 interest — a single whole-account ledger entry, no matching
  // contribution row (interest isn't a contribution, and it isn't scoped to
  // one employer relationship).
  await db.transaction((tx) =>
    postLedgerEntry(tx, {
      memberId: member.id,
      transactionId: crypto.randomUUID(),
      type: "INTEREST",
      direction: "CREDIT",
      amountPaise: 58_940_00n,
      reference: "Interest for FY 2025-26 at 8.25%",
    }),
  );

  // Earlier two employments: one lump-sum contribution row each
  // (simplification, not month-by-month) so the per-employer "contributed"
  // figure the dashboard and passbook show stays internally consistent with
  // the ledger total, without generating years of synthetic monthly rows.
  const priorEmployers = [
    { employment: kaveri, lumpPaise: 2_64_120_00n, label: "Kaveri Retail Ltd — closing balance at transfer" },
    { employment: sunfield, lumpPaise: 59_720_00n, label: "Sunfield Tech LLP — closing balance at transfer" },
  ];

  for (const p of priorEmployers) {
    const [contribution] = await db
      .insert(contributions)
      .values({
        memberId: member.id,
        employmentId: p.employment.id,
        month: p.employment.exitedOn!.slice(0, 7),
        employeeSharePaise: p.lumpPaise,
        employerSharePaise: 0n,
        pensionSharePaise: 0n,
        postedOn: new Date(p.employment.exitedOn!),
        status: "POSTED",
        reference: p.label,
      })
      .returning();
    if (!contribution) throw new Error(`seed: contribution insert returned no row for ${p.label}`);

    await db.transaction((tx) =>
      postLedgerEntry(tx, {
        memberId: member.id,
        transactionId: crypto.randomUUID(),
        type: "CONTRIBUTION",
        direction: "CREDIT",
        amountPaise: p.lumpPaise,
        reference: p.label,
        employmentId: p.employment.id,
        contributionId: contribution.id,
      }),
    );
  }

  const [finalBalance] = await db
    .select()
    .from(memberBalances)
    .where(eq(memberBalances.memberId, member.id))
    .limit(1);
  console.log(
    `Seeded member ${member.fullName} — UAN ${member.uan} (id ${member.id}), ` +
      `final balance ${finalBalance?.currentBalancePaise} paise across 3 employments.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
