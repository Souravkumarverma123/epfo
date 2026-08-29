# Architecture Decision Records

PRD §45 requires an ADR for architectural changes, "especially important for
AI-generated changes".

A note on provenance, because it matters for reading these: ADR-001 and
ADR-002 were **written down after the fact**. The decisions themselves were
made during the build and are evidenced in code comments at the point of use
(`packages/application/repositories/base-repository.ts`,
`packages/database/models/ledger.ts`, `.../idempotency.ts`, `.../outbox.ts`) —
six of those comments cite "ADR-002" by number. What did not happen is anyone
writing the ADR files, so those citations pointed at a directory that did not
exist. These two files close that gap; they record decisions already visible
in the code rather than new ones, and they are not backdated.

ADR-003 was written alongside the change it describes.

| ADR | Title |
| --- | --- |
| [001](ADR-001-package-boundaries.md) | Package boundaries and the repository/service split |
| [002](ADR-002-transaction-safety.md) | Transaction-safety amendments to the PRD data model |
| [003](ADR-003-operations-console.md) | Audit trail and the operations console |
