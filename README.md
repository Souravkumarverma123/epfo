# Monorepo

A full-stack monorepo powered by **Turborepo**, **pnpm**, and **TypeScript**.

## Stack

| Layer       | Tech                                        |
| ----------- | ------------------------------------------- |
| Frontend    | Next.js 16, Tailwind CSS 4, shadcn/ui       |
| Backend     | Express, tRPC, trpc-to-openapi, Scalar docs |
| Database    | PostgreSQL, Drizzle ORM                      |
| Tooling     | Turborepo, pnpm, ESLint, Prettier           |

## Project Structure

```
apps/
  web/          → Next.js frontend
  api/          → Express + tRPC backend

packages/
  database/     → Drizzle ORM schema & migrations
  trpc/         → Shared tRPC router & client types
  services/     → Business logic layer
  logger/       → Winston logger
  eslint-config/    → Shared ESLint configs
  typescript-config/ → Shared TypeScript configs
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm 9+
- Docker (for PostgreSQL)

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Create .env (copy from .env.example)
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Start development
pnpm dev
```

### Environment Variables

Create a `.env` file in the root with:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev
```

## Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Start all apps in dev mode       |
| `pnpm build`       | Build all apps and packages      |
| `pnpm db:generate` | Generate Drizzle migrations      |
| `pnpm db:migrate`  | Run database migrations          |
| `pnpm lint`        | Run ESLint across all packages   |
| `pnpm format`      | Format code with Prettier        |
