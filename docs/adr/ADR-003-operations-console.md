# ADR-003 — Audit trail and the operations console

## Context

PRD §47's "killer demonstration" is twelve steps. Ten are citizen-side and
were built. Two are not:

- step 5 — "Admin dashboard shows the claim"
- step 12 — "Admin searches operation ID and sees the full end-to-end trace"

Both need PRD §36's operations portal, which did not exist. Two supporting
pieces were also incomplete: PRD §25's audit system had a migrated,
indexed `audit_log` table that **nothing wrote to or read from**, and
PRD §26's `operation_id` was stamped on every claim but never propagated or
made searchable — so there was no trace to look up.

The PRD's own framing is that this demonstration "should prove reliability
rather than merely show screens". Without the operator half, the system's
central claims — nothing lost, nothing duplicated, everything explainable —
are asserted by the UI rather than evidenced from stored state.

## Decision

Three changes.

### 1. Write the audit trail

`AuditRepository` (append-only by construction: no update, no delete method)
records every claim submission, replayed duplicate, state transition,
dependency hold, recovery, operator retry, and the ledger debit at completion.
`before`/`after` snapshots pass through `@repo/domain`'s `redactPII` inside
the repository, so no call site can forget it (PRD §24).

Where a state change already runs in a transaction — submission, completion —
the audit row is written **in that same transaction**. An audit row exists if
and only if the change it describes committed.

### 2. `/ops` — the operations console

One page: dependency status, claim counts, acknowledgement-latency
percentiles, outbox counts, reconciliation, held claims, recent claims, and a
single search box accepting a claim number, a UAN or an operation ID
(distinguished by shape rather than a dropdown). A claim opens to its full
trace: transitions, audit trail, audit rows from the same operation against
other resources (the ledger debit), and outbox events.

### 3. Reconciliation

`LedgerRepository.reconcileBalances` recomputes credits-minus-debits from
`ledger_entries` and compares it against the cached `member_balances` row
(PRD §12, §34, §48). Surfaced on the console.

## Alternatives

- **A separate `apps/admin`,** per PRD §9. Rejected for the same reason as
  ADR-001: a second Next.js app, second container, second deploy target and
  second CI path, to serve one route. The console shares `SiteShell` and ships
  with the site.
- **Reconstruct the trace from `claim_transitions` alone.** Rejected: the
  transitions table cannot show the ledger debit, the absorbed duplicate
  submissions, or who requested a retry. Those live on other resources and are
  exactly what makes the trace evidence rather than a status history.
- **Build an officer persona with OIDC + RBAC** (PRD §23). Rejected on time,
  and deliberately not faked. See consequences.

## Consequences

- **The console is unauthenticated, and says so on screen.** There is no
  officer identity in this build. Inventing a third mock login would make the
  console *look* authorized without being so, which is worse than stating the
  gap: a viewer can then tell the difference between what is real and what is
  staged. The retry mutation still writes an `OFFICER` audit row naming the
  actor, so the action is accountable even though the identity behind it is a
  stand-in. **This is a prototype-only posture and must not survive contact
  with real data.**
- Claims created before this change have empty audit trails. Their transition
  history is intact; the audit table starts where the code does.
- `advanceIfDue` gained a `force` option for operator retry. It skips only the
  demo pacing interval — the state machine, the dependency gate and optimistic
  concurrency all still apply, so a retry cannot move a claim anywhere a
  normal poll could not have moved it.
- The absorbed duplicates of an idempotent submission are now visible as audit
  rows. "Submitted five times, one claim" became a thing an operator reads
  back from stored state instead of a claim made on stage.
