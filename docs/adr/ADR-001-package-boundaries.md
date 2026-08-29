# ADR-001 — Package boundaries and the repository/service split

## Context

PRD §9 sketches a repository layout with a `packages/domain/` split into eight
domain packages (`identity`, `member`, `contribution`, `ledger`, `claims`,
`payment`, `kyc`, `notification`), a separate `packages/application/`, and
apps for `web`, `api`, `admin` and `worker`. PRD §10 sets the dependency rule:
UI → API → Application → Domain → repository interfaces, with domain code
depending on nothing framework-shaped.

The full layout is roughly twenty packages. For a prototype built to a
hackathon deadline by one person, twenty package.json files is an amount of
ceremony that buys nothing: the boundary that actually protects the code is
the *dependency direction*, not the number of directories enforcing it.

## Decision

Keep PRD §10's dependency rule exactly. Collapse PRD §9's package *count*.

- `packages/domain` — one package, subdivided by folder (`src/claims`,
  `src/member`, `src/identity`), not by package. Pure functions, zero I/O, no
  imports of tRPC/Next/Express/Drizzle.
- `packages/application` — repositories and services together. Repositories
  are the only place that imports Drizzle tables; services orchestrate them
  and own transaction boundaries.
- `packages/database` — schema and migrations.
- `packages/trpc` — routers only; a router translates HTTP to a use case and
  does nothing else.

Repositories depend directly on `@repo/database` rather than implementing
interfaces the domain declares. The rule that survives is the one that pays:
nothing above a repository may skip past it to the database.

## Alternatives

1. **PRD §9 literally.** Rejected: ~20 packages, each with its own build and
   tsconfig, to express boundaries that a lint rule and a code review already
   express. The cost is paid every build; the benefit arrives only if separate
   teams own separate packages, which is not the case here.
2. **Full hexagonal architecture** — domain declares repository interfaces,
   database implements them. Rejected for the prototype: it adds an
   indirection per entity whose payoff (swapping the persistence layer) is not
   a thing this project will do. The direction of dependency is preserved
   without it.
3. **No application layer** — services inside tRPC routers. Rejected outright;
   PRD §42 forbids business logic in routers, and it would make the same use
   case unreachable from a worker or a REST handler.

## Consequences

- The PRD's `apps/admin` and `apps/worker` do not exist. The admin surface is
  a route inside `apps/web` (see ADR-003); there is no worker process, and the
  claim workflow advances on status poll instead (documented as a stand-in for
  Inngest, PRD §14).
- A future extraction into per-domain packages is mechanical — the folders
  already sit on the boundaries — but it has not been done.
- `packages/domain` having no I/O is enforced by convention and review, not by
  tooling. A dependency-cruiser rule would be the honest next step.
