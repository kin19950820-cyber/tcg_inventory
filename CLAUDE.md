# Claude Working Guide (Token-Saving)

This file keeps Claude sessions fast and low-token for this repository.

## Project Snapshot
- Stack: Next.js App Router + TypeScript + Prisma + SQLite + Tailwind.
- Main domain: TCG inventory, pricing, dashboard analytics, transactions, messaging.
- Primary backend entry points: `src/app/api/**/route.ts`.

## Start Small (Do Not Load Everything)
1. Open only these first:
- `package.json`
- `src/app/layout.tsx`
- The specific route/page being changed
- One related service in `src/services/`
2. Use file search before reading:
- `rg "<symbol_or_string>" src`
- `rg --files src/app src/services src/components`
3. Read files in slices when possible (top-level exports first).

## High-Value File Map
- App pages/routes: `src/app/**`
- API handlers: `src/app/api/**/route.ts`
- Business logic: `src/services/**`
- External providers/scrapers: `src/providers/**`, `scripts/snkrdunk-scraper/**`
- Prisma schema/seeding: `prisma/schema.prisma`, `prisma/seed.ts`

## Token Guardrails
- Prefer `rg` over broad directory reads.
- Avoid opening generated/build folders.
- Avoid full lockfile reads.
- Keep responses focused on edited files and test outcomes.
- Summarize unchanged architecture instead of repeating it.

## Dev Commands
```bash
npm run dev
npm run lint
npm run build
npm run db:push
npm run db:seed
```

## Safe Change Pattern
1. Locate target code with `rg`.
2. Edit minimal files.
3. Run `npm run lint` (and build when needed).
4. Report: what changed, why, and any residual risks.
