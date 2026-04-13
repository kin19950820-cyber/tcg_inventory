# Performance Tuning Guide

This document targets runtime performance for the current Next.js + Prisma architecture.

## Quick Wins (Highest ROI)
1. Keep pages as Server Components by default; move only interactive islands to client components.
2. Add explicit pagination limits to every list endpoint and UI table.
3. Select only required fields in Prisma queries (`select`) instead of broad `include` trees.
4. Add route-level caching/revalidation for read-heavy endpoints.
5. Debounce expensive search and price-refresh actions on the client.

## Next.js App Router

## Rendering Strategy
- Prefer static or revalidated data for dashboard-like views that do not need per-request freshness.
- For highly dynamic routes, mark only those routes dynamic.
- Avoid accidental global dynamism from request-bound APIs in shared layouts.

## Bundles and Client JS
- Keep large charting/components in lazy client chunks where possible.
- Avoid importing server-only utilities into client components.
- Audit client boundaries in `src/app/**` and `src/components/**`.

## API Routes
- Validate and short-circuit early for bad requests.
- Return small payloads for list pages (summary fields only).
- Use consistent pagination params (`page`, `pageSize`) and enforce sane maximums.

## Prisma and Database

## Query Shaping
- Prefer:
```ts
prisma.inventoryItem.findMany({
  select: {
    id: true,
    cardName: true,
    quantity: true,
    latestMarketPrice: true,
  },
  take: 50,
  skip: 0,
})
```
- Avoid loading nested relations unless the UI needs them immediately.

## Indexing Targets
Consider indexes on frequently filtered/sorted fields in `schema.prisma`:
- `InventoryItem(updatedAt)` for recent sorting
- `Transaction(transactionDate)` for history views
- `Transaction(inventoryItemId, transactionDate)` for per-item timelines
- `CardCatalog(game, setName)` if used often in filters

Note: `contains` fuzzy search on large text fields may not use indexes effectively in SQLite; if catalog growth is significant, consider SQLite FTS tables for search.

## Caching and Refresh
- Cache external pricing provider results with TTL.
- Separate manual refresh from background refresh jobs.
- Record `lastPricedAt` per item to skip overly-frequent refreshes.

## Scraper/Provider Paths
- Add request timeouts and retry caps.
- Persist provider failure counts and backoff on repeated failures.
- Normalize external responses once in provider layer; keep service logic deterministic.

## Observability
Track at minimum:
- API latency per route
- Slow Prisma query durations
- Price refresh job duration + items processed
- Error rates by provider source

## Validation Commands
```bash
npm run lint
npm run build
```
If you add DB indexes or query changes, run:
```bash
npm run db:push
```
