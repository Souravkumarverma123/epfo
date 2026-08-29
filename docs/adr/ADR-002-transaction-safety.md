# ADR-002 — Transaction-safety amendments to the PRD data model

## Context

PRD §11 lists the fields for each entity; §12 requires an immutable ledger
with a derived balance; §16 requires idempotency and optimistic concurrency;
§17 requires a transactional outbox. Implementing those literally exposed
three gaps where the field list as written is not sufficient to make the
guarantee the surrounding prose promises.

This ADR is cited by name from
`packages/database/models/ledger.ts`, `.../idempotency.ts`, `.../outbox.ts`,
`packages/database/seed.ts` and
`packages/application/repositories/ledger-repository.ts`.

## Decision

Three additions beyond PRD §11's field lists.

### 1. `ledger_entries.sequence_number`, unique per member

§11 gives LedgerEntry a `balance_after`. With concurrent withdrawals, two
transactions can both read the same starting balance and both write a
`balance_after` computed from it — the ledger then contains two rows that each
look correct and are jointly wrong.

A monotonic per-member `sequence_number` with a unique index on
`(member_id, sequence_number)` makes that collision impossible in the
database rather than in application code. Writers take `SELECT … FOR UPDATE`
on the member's `member_balances` row, which serialises the read-modify-write
and hands out the next sequence number under the lock.

### 2. `idempotency_records` keyed by `(actor, operation, key)`

§11 gives IdempotencyRecord a `key`. A bare key is global: two members whose
clients generate the same UUID would collide, and one would silently receive
the other's stored response. Scoping the primary key to the actor and the
operation removes a cross-tenant data leak that a global key makes reachable.

### 3. `outbox_events.locked_until` and `schema_version`

§17's outbox assumes a publisher. Two publisher instances polling the same
table will both pick up the same PENDING row and publish it twice — the exact
duplicate the pattern exists to prevent. `locked_until` gives a publisher a
lease (`SELECT … FOR UPDATE SKIP LOCKED` over unlocked-or-expired rows).
`schema_version` lets the event envelope in §15 evolve without breaking
consumers pinned to an older shape.

## Alternatives

- **Serializable isolation for ledger writes** instead of a sequence number.
  Rejected: it converts the problem into retry-on-serialization-failure at
  every call site, and the unique index states the invariant declaratively
  where anyone reading the schema will see it.
- **A mutable `member.balance` as the source of truth.** Rejected by PRD §12
  directly. The derived `member_balances` row exists only as a fast read and
  is reconciled against the ledger (see ADR-003).
- **Advisory locks / Redis for outbox coordination.** Rejected: PRD §20 says
  Redis must not become authoritative for financial workflow state, and a
  lease column keeps the mechanism in the same transaction as the data.

## Consequences

- `LedgerRepository.postEntry` **must** run inside `withTransaction`. Called
  outside one it takes the row lock and releases it immediately, losing the
  serialisation. This is a real footgun and is documented at the method.
- The outbox lease is implemented but unexercised: there is no publisher in
  this build (PRD Phase 4, Inngest, not built), so rows accumulate as PENDING.
  That is the pattern behaving correctly — the trigger is durable and nothing
  is lost — not a backlog.
- Reconciliation between the derived balance and the ledger is required to
  detect drift if any writer ever bypasses `postEntry`. ADR-003 adds it.
