# EPFO One — Project Status

Last updated: 2026-08-29. Hackathon submission deadline: today, 8:00 PM IST
(buildwhatmovesindia.com).

## What this is

A prototype rebuild of the EPFO member portal for the "Build What Moves
India" hackathon (brief: buildwhatmovesindia.com/brief). Built against a
design file ("EPFO Portal Redesign.dc.html") pixel-matched throughout, and a
PRD (`EPFO_One_PRD_v1.0.pdf` in `~/Downloads`) whose central thesis is: **once
the system says it received a claim, it must be able to explain where it is,
recover it after failures, and never process it twice.**

## Stack

Monorepo (pnpm workspaces, Turborepo): `apps/web` (Next.js 16, App Router,
themed to match the design — no shadcn Card/dark theme, real site palette),
`apps/api` (Express + tRPC + REST via trpc-to-openapi), `packages/domain`
(pure business rules, zero I/O), `packages/application` (repositories +
services), `packages/database` (Drizzle + Postgres), `packages/trpc`
(routers). Architecture: `UI → tRPC procedure → Service → Repository →
Postgres`. See `docs/adr/` for the naming/boundary decisions made early on.

Local dev: Postgres via Docker (`docker compose up -d`), API on :8000, web on
:3000. Operator surfaces: `/ops` (console) and `/demo/dependencies` (failure
injection) — both unauthenticated on purpose, see ADR-003. Seed: `pnpm --filter @repo/database db:seed` (one member, UAN
`100234567890`, mock OTP login — code is echoed back in dev, no real SMS).

## What's built and verified (all typechecked + tested live, not just compiled)

- **Auth** — mock OTP login (no password subsystem — deliberate). Session
  cookie, `protectedProcedure` middleware.
- **Dashboard** — real balance, employment history, pension service
  calculation, "things that need you" tasks derived from real fields only
  (no fabricated data).
- **Passbook** — FY + employer filters, real running balance per
  contribution row (ledger_entries now carries `employmentId` +
  `contributionId` FKs for this — see ADR-ish comment in
  `packages/database/models/ledger.ts`).
- **Claims** — 4-step wizard, **idempotent submission** (proven: same key +
  body → replay, not duplicate; same key + different body → 409), real
  server-side eligibility re-check, transactional outbox (claim + event
  commit atomically).
- **The reliability/chaos demo** — THE centerpiece. A claim auto-advances
  through the full state machine on each status poll (stand-in for
  Inngest — documented as such, and actually the right shape for a
  serverless deploy target). `/demo/dependencies` lets you take KYC or
  Payment down; an in-flight claim holds safely at `FAILED_RETRYABLE`
  (citizen sees "your claim is safe", not an error), timeline correctly
  shows prior steps done + the stuck step active, and it **resumes
  automatically** when the dependency comes back — no data loss, no
  re-submission. Claim completion **actually debits the ledger** (real
  `WITHDRAWAL` entry, not a fake status).
- **Audit trail (PRD §25)** — `audit_log` is written on every claim
  submission, absorbed duplicate, state transition, dependency hold,
  recovery, operator retry and ledger debit. Append-only by construction
  (`AuditRepository` has no update/delete method); before/after snapshots go
  through `redactPII` inside the repository so no call site can forget it.
  Where the state change is already transactional, the audit row commits in
  that same transaction.
- **Operations console (`/ops`, PRD §36/§37)** — the operator half of the
  PRD's killer demo (§47 steps 5 and 12), which was the largest remaining
  gap. Dependency status, claim counts, acknowledgement-latency percentiles,
  outbox counts, reconciliation, held claims, recent claims, and one search
  box that takes a claim number, a UAN **or an operation ID** (told apart by
  shape). Opening a claim shows its whole trace: transitions, audit trail,
  audit rows from the same operation against *other* resources (the ledger
  debit), and outbox events. Retry control for held claims — it skips only
  the demo pacing interval; the state machine, dependency gate and
  optimistic concurrency all still apply.
  Verified end-to-end against live Postgres: 5 submits → 1 claim + 4
  recorded replays; KYC down → held with reason; operator retry while still
  down → correctly unchanged; KYC up → auto-resume to COMPLETED; ledger
  debit found by operation ID; reconciliation clean after the debit.
- **Reconciliation (PRD §12/§34/§48)** — recomputes credits-minus-debits
  from `ledger_entries` and compares against the cached `member_balances`
  row. Surfaced on `/ops`.
- **Your details (KYC)** — real data, includes a real `nominees` table
  (not fabricated — schema + repo + seed data). Every field has a
  `Change`/`Add`/`Confirm` action matching the design, honestly `disabled`
  with a tooltip (no dead/misleading controls) since there's no
  profile-edit backend.
- **Help, All services (A-Z), Employer** — static/informational, explicitly
  NOT backed by fake data (Help has no fabricated "open cases" table since
  there's no grievance entity; Employer has a visible "illustrative only,
  no employer login" banner).
- **Production build verified** (`next build`) — caught and fixed a real
  deploy-blocking bug (deleted an unused, version-skewed
  `components/ui/resizable.tsx` that nothing imported).

## Deployment — DONE, live

**https://epfo.ultrahuman.co.in** — real HTTPS (Let's Encrypt via Caddy),
real Postgres, migrated and seeded, verified end-to-end through the public
domain (not just internally). Docker on a single EC2 box (`t3.small`,
`ap-south-1`), images on Docker Hub, single-domain path-based routing so
the API's session cookies work as ordinary same-site Secure cookies. Full
CI/CD: push to `main` → GitHub Actions builds both images, pushes to
Docker Hub, SSHes into the box, pulls, restarts. See `docs/DEPLOY.md` for
the exact, tested runbook (not a plan — every command in it was actually
run).

## What's NOT built (honest list, PRD section by section)

Since the last update the OpenAI assistant (gpt-4o-mini, tool-calling —
reads real balance and claim status, has no tool that can mutate anything)
and the employer login + dashboard both landed. What remains:

1. **Tests — the biggest remaining gap.** PRD §38 asks for unit, integration,
   E2E, contract, load and chaos tests; §41 puts lint/typecheck/unit/
   integration in CI; §44's Definition of Done lists "unit tests pass". CI
   currently builds and pushes Docker images and nothing else. The chaos
   scenario (§40) *has* been executed by hand and its expected business state
   verified — see the `/ops` verification note above — but by hand, not by a
   committed test.
2. **Inngest (PRD §14, Phase 4)** — claims advance on status poll instead of
   a durable workflow engine. Documented as a stand-in at
   `ClaimsService.STEP_INTERVAL_MS`; the outbox is written correctly and has
   no publisher, so events accumulate as PENDING by design.
3. **Officer/OIDC auth and RBAC (PRD §23)** — `/ops` and `/demo/dependencies`
   are unauthenticated on purpose rather than protected by a third mock
   login. See ADR-003; the console states this on screen.
4. **Accessibility not audited (PRD §31)** — contrast, screen reader and
   keyboard nav have not been checked against WCAG 2.2 AA. `/accessibility`
   says so plainly on the site.
5. **Observability (PRD §26/§27)** — no OpenTelemetry/Prometheus/Grafana.
   Partial substitute: `operation_id` correlates a claim's whole trace and
   `/ops` reads it back, and acknowledgement-latency percentiles are computed
   in Postgres. There are no traces or metric exporters.
6. **Object storage / documents (PRD §21)** — `documents` table exists;
   no S3/MinIO, no upload, no scanning.
7. **Not attempted, out of MVP scope or deliberately dropped** — real
   Aadhaar/NPCI/bank integrations (§6 out of scope), feature flags (§35),
   legacy migration adapters (§33), load testing (§39), profile editing
   (buttons visibly disabled with reasons), employer-side ECR filing and
   challans, Kubernetes/Terraform (§46 Phase 9). Real devices untested —
   emulated viewports only.

## Key decisions worth knowing if resuming fresh

- Money: bigint paise everywhere in the backend; wire format is a decimal
  string (`paiseToWire`/`parsePaiseWire` in `@repo/domain`); `formatINR` for
  display. Never floats.
- Ledger concurrency: `SELECT ... FOR UPDATE` + per-member sequence number,
  must run inside `withTransaction` (see `LedgerRepository.postEntry`).
- i18n: server sends `{en, hi}` bilingual objects for anything
  user-facing that isn't already a translated UI string; client picks via
  `useLang()` (`apps/web/design/lang.tsx`).
- Site chrome (`apps/web/components/site/`) is shared — `SiteShell`,
  `SiteHeader`, `SiteFooter`, `RequireAuth` — every new page composes these,
  never duplicates header/footer markup.
- Honesty principle applied consistently: nothing fabricated. If data
  doesn't exist in the schema, either add it for real (nominees) or say
  plainly it's not implemented (disabled buttons with tooltips, Employer's
  banner) — never a fake-looking control that does nothing silently.

## If you're a fresh session reading this

Read this file first, then `docs/adr/` for the "why" behind the package
layout and naming. The user (Sourav) prefers: concise answers, being told
the plan before big work starts, principal-engineer-level tradeoff calls
made explicitly rather than silently, and no fabricated/dishonest UI. Ask
before large architecture changes; routine implementation calls are fine to
just make and briefly note.
