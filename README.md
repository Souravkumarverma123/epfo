# EPFO One

A prototype rebuild of the EPFO member portal, built for the **Build What Moves
India** hackathon ([buildwhatmovesindia.com/brief](https://buildwhatmovesindia.com/brief)).

**Live:** https://epfo.ultrahuman.co.in

## The problem it solves

Once the system tells a citizen it has received a PF claim, it must be able to
explain where that claim is, recover it after failures, and never process it
twice. Today those claims go opaque — no visibility into whether one is stuck,
lost, or silently duplicated. EPFO One is a complete citizen journey built
around making claim submission **reliable and legible**:

- **Idempotent submission** — the same request replayed is absorbed, not
  duplicated (same key + different body → `409`).
- **Transactional outbox** — the claim and its events commit atomically.
- **Visible recovery** — a dependency (KYC / Payment) can be taken down live;
  an in-flight claim holds safely at `FAILED_RETRYABLE` ("your claim is safe",
  not an error) and resumes automatically when the dependency returns.
- **Plain-language status** and a live status page that updates itself.
- **Append-only audit trail** with PII redaction, and an **operations console**
  that traces a claim end to end by claim number, UAN, or operation ID.
- **AI assistant** (OpenAI `gpt-4o-mini`, tool-calling) that reads real balance
  and claim status — with no tool that can mutate anything.

All member, employer, and claim records are **synthetic seed data**. The login
OTP is shown on screen (no SMS gateway); no real payment or government system
is touched.

## Stack

| Layer     | Tech                                                          |
| --------- | ------------------------------------------------------------ |
| Frontend  | Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI |
| Backend   | Express 5, tRPC 11, trpc-to-openapi (REST), Scalar API docs |
| Database  | PostgreSQL 15, Drizzle ORM                                   |
| Tooling   | Turborepo, pnpm workspaces, ESLint, Prettier, TypeScript    |
| Deploy    | Docker, Caddy (HTTPS), AWS EC2, GitHub Actions CI/CD        |

Architecture: `UI → tRPC procedure → Service → Repository → Postgres`.
Business rules live in `packages/domain` with zero I/O. See `docs/adr/` for the
package-boundary and transaction-safety decisions.

## Project structure

```
apps/
  web/          → Next.js frontend (port 3000)
  api/          → Express + tRPC backend (port 8000)

packages/
  domain/       → Pure business rules (money, claims eligibility, PII) — no I/O
  application/  → Repositories + services (auth, claims, passbook, ops, assistant)
  database/     → Drizzle schema, migrations, seed
  trpc/         → Shared tRPC routers & client types
  logger/       → Winston logger
  eslint-config/, typescript-config/ → Shared configs
```

## Getting started

### Prerequisites

- Node.js ≥ 18
- pnpm 9
- Docker (for PostgreSQL)

### Setup

```bash
# Install dependencies
pnpm install

# Create .env from the template
cp .env.example .env

# Start PostgreSQL
docker compose up -d

# Run migrations and seed synthetic data
pnpm db:migrate
pnpm --filter @repo/database db:seed

# Start web + api in dev mode
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:8000 · REST docs at http://localhost:8000/docs

### Mock login

| Portal   | Identifier               | OTP                                    |
| -------- | ------------------------ | -------------------------------------- |
| Member   | UAN `100234567890`       | shown on screen — click "Fill in"      |
| Employer | Est. code `BGBNG00456780000123` | shown on screen — click "Fill in" |

Operator surfaces (unauthenticated by design — see ADR-003):

- `/ops` — operations console
- `/demo/dependencies` — failure injection for the recovery demo

### Environment variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev
PORT=8000
NODE_ENV=development
BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000/trpc
# Optional locally (the AI assistant errors cleanly without it); required in prod
OPENAI_API_KEY=
```

## Scripts

| Command                                  | Description                       |
| ---------------------------------------- | -------------------------------- |
| `pnpm dev`                               | Start all apps in dev mode       |
| `pnpm build`                             | Build all apps and packages      |
| `pnpm test`                              | Run domain unit tests            |
| `pnpm lint`                              | Run ESLint across the workspace  |
| `pnpm check-types`                       | Typecheck all packages           |
| `pnpm format`                            | Format with Prettier             |
| `pnpm db:generate`                       | Generate Drizzle migrations      |
| `pnpm db:migrate`                        | Run database migrations          |
| `pnpm --filter @repo/database db:seed`   | Seed synthetic data              |
| `pnpm --filter @repo/database dev`       | Open Drizzle Studio              |

## Deployment

Push to `main` → GitHub Actions builds the web and api Docker images, pushes to
Docker Hub, SSHes into the EC2 box, pulls, and restarts. Caddy terminates TLS
(Let's Encrypt) with single-domain path-based routing so the API's session
cookies work as ordinary same-site Secure cookies. See `docs/DEPLOY.md` for the
tested runbook and `docs/PROJECT_STATUS.md` for what is built vs. still mocked.

## What is not built (honest list)

Automated test coverage is thin (domain unit tests only; the chaos scenario is
verified by hand). No Inngest/durable workflow engine (claims advance on status
poll), no officer/OIDC auth, no WCAG accessibility audit, no object storage for
documents, no observability stack. Full section-by-section list in
`docs/PROJECT_STATUS.md`.
