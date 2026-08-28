# EPFO One — Project Status

Last updated: 2026-08-28. Hackathon submission deadline: today, 8:00 PM IST
(buildwhatmovesindia.com). ~10 hours remaining as of last update.

## What this is

A prototype rebuild of the EPFO member portal for the "Build What Moves
India" hackathon (brief: buildwhatmovesindia.com/brief). Built against a
design file ("EPFO Portal Redesign.dc.html") pixel-matched throughout, and a
PRD (`EPFO_One_PRD_v1.0.pdf` in Downloads) whose central thesis is: **once
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
:3000. Seed: `pnpm --filter @repo/database db:seed` (one member, UAN
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

## What's NOT built yet (the remaining plan, in order)

1. **OpenAI-powered layer** — required by the hackathon brief ("powered by
   an OpenAI model"). Design principle already agreed: **the model explains
   state, it never decides it** — reads committed Postgres state, produces
   language; never determines eligibility/amounts/transitions. Planned
   smallest high-impact piece: a status/rejection explainer tied into the
   claim status page, personalizing the existing deterministic bilingual
   copy in `packages/domain/src/claims/copy.ts`. Blocked on: user's OpenAI
   API key.
2. **Final pass** — test the live deployed site end-to-end (a first pass
   already done during deploy verification, but worth a full walkthrough
   once the OpenAI layer lands), help draft the 2-minute video script and
   the <250-word project summary the brief requires.

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
