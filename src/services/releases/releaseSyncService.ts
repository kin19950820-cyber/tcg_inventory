/**
 * Release Sync Orchestrator
 *
 * Runs all providers in sequence. Each provider's failures are isolated —
 * one failing provider does not block others.
 *
 * Deduplication key: (sourceName, sourceExternalId)
 * On conflict: update dates/status/imageUrl/lastSeenAt; preserve firstSeenAt.
 *
 * "isNew" is cleared after 7 days via lastSeenAt comparison.
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { NormalizedRelease, ReleaseProvider, ProviderSyncResult } from './types'
import { pokemonTcgApiProvider } from './pokemonTcgApiProvider'
import { manualReleaseProvider }  from './manualReleaseProvider'
import { beckettReleaseProvider } from './beckettReleaseProvider'

// ── Provider registry ─────────────────────────────────────────────────────────
// Priority order: official APIs → aggregators → manual
const PROVIDERS: ReleaseProvider[] = [
  pokemonTcgApiProvider,
  beckettReleaseProvider,
  manualReleaseProvider,    // always last — fills gaps, never loses to an API
]

const NEW_PRODUCT_TTL_DAYS = 7

type ProductSyncLogDelegate = {
  create: typeof prisma.productSyncLog.create
  update: typeof prisma.productSyncLog.update
  findMany: typeof prisma.productSyncLog.findMany
}

function getProductSyncLogDelegate(): ProductSyncLogDelegate | null {
  const candidate = (prisma as unknown as { productSyncLog?: ProductSyncLogDelegate }).productSyncLog
  if (!candidate?.create || !candidate?.update || !candidate?.findMany) return null
  return candidate
}

function isMissingProductSyncLogTableError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code !== 'P2021') return false
  const table = String(error.meta?.table ?? '')
  const modelName = String(error.meta?.modelName ?? '')
  return table.includes('ProductSyncLog') || modelName === 'ProductSyncLog'
}

// ── Core upsert ───────────────────────────────────────────────────────────────

async function upsertRelease(r: NormalizedRelease): Promise<'inserted' | 'updated' | 'failed'> {
  if (!r.sourceName || !r.sourceExternalId || !r.name) return 'failed'

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - NEW_PRODUCT_TTL_DAYS * 86400000)

  try {
    const existing = await prisma.productRelease.findFirst({
      where: { sourceName: r.sourceName, sourceExternalId: r.sourceExternalId },
    })

    if (existing) {
      // Update: refresh dates, status, image, lastSeenAt; preserve firstSeenAt / isNew
      await prisma.productRelease.update({
        where: { id: existing.id },
        data: {
          name:             r.name,
          productStatus:    r.status,
          manufacturer:     r.manufacturer ?? existing.manufacturer,
          brand:            r.brand        ?? existing.brand,
          productLine:      r.productLine  ?? existing.productLine,
          sport:            r.sport        ?? existing.sport,
          game:             r.game         ?? existing.game,
          season:           r.season       ?? existing.season,
          year:             r.year         ?? existing.year,
          imageUrl:         r.imageUrl     ?? existing.imageUrl,
          externalUrl:      r.externalUrl  ?? existing.externalUrl,
          description:      r.description  ?? existing.description,
          announcementDate: r.announcementDate ?? existing.announcementDate,
          preorderDate:     r.preorderDate     ?? existing.preorderDate,
          releaseDate:      r.releaseDate       ?? existing.releaseDate,
          sourceUrl:        r.sourceUrl         ?? existing.sourceUrl,
          lastSeenAt:       now,
          lastCheckedAt:    now,
          // isNew stays true until TTL expires
          isNew:            existing.firstSeenAt > sevenDaysAgo,
        },
      })
      return 'updated'
    } else {
      await prisma.productRelease.create({
        data: {
          name:             r.name,
          productStatus:    r.status,
          category:         r.category,
          manufacturer:     r.manufacturer ?? null,
          brand:            r.brand        ?? null,
          productLine:      r.productLine  ?? null,
          sport:            r.sport        ?? null,
          game:             r.game         ?? null,
          season:           r.season       ?? null,
          year:             r.year         ?? null,
          imageUrl:         r.imageUrl     ?? null,
          externalUrl:      r.externalUrl  ?? null,
          description:      r.description  ?? null,
          announcementDate: r.announcementDate ?? null,
          preorderDate:     r.preorderDate     ?? null,
          releaseDate:      r.releaseDate       ?? null,
          sourceName:       r.sourceName,
          sourceUrl:        r.sourceUrl    ?? null,
          sourceExternalId: r.sourceExternalId,
          isNew:            true,
          firstSeenAt:      now,
          lastSeenAt:       now,
          lastCheckedAt:    now,
        },
      })
      return 'inserted'
    }
  } catch (error) {
    console.error('[release-sync] upsert failed', {
      sourceName: r.sourceName,
      sourceExternalId: r.sourceExternalId,
      name: r.name,
      error: String(error),
    })
    return 'failed'
  }
}

// ── Provider runner ───────────────────────────────────────────────────────────

async function runProvider(provider: ReleaseProvider): Promise<ProviderSyncResult> {
  const logDelegate = getProductSyncLogDelegate()
  let log: { id: string } | null = null
  if (logDelegate) {
    try {
      log = await logDelegate.create({
        data: { providerName: provider.name, startedAt: new Date() },
      })
    } catch (error) {
      if (!isMissingProductSyncLogTableError(error)) throw error
    }
  }

  let releases: NormalizedRelease[] = []
  let fetchError: string | null = null

  try {
    releases = await provider.fetch()
  } catch (err) {
    fetchError = String(err)
  }

  let inserted = 0, updated = 0, failed = 0

  for (const release of releases) {
    const outcome = await upsertRelease(release)
    if (outcome === 'inserted') inserted++
    else if (outcome === 'updated') updated++
    else failed++
  }

  const success = fetchError === null
  if (log && logDelegate) {
    try {
      await logDelegate.update({
        where: { id: log.id },
        data: {
          completedAt:   new Date(),
          success,
          insertedCount: inserted,
          updatedCount:  updated,
          failedCount:   failed,
          errorSummary:  fetchError ?? (failed > 0 ? `${failed} records failed to upsert` : null),
        },
      })
    } catch (error) {
      if (!isMissingProductSyncLogTableError(error)) throw error
    }
  }

  return {
    providerName:  provider.name,
    success,
    insertedCount: inserted,
    updatedCount:  updated,
    failedCount:   failed,
    errorSummary:  fetchError,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface FullSyncResult {
  providers: ProviderSyncResult[]
  totalInserted: number
  totalUpdated: number
  totalFailed: number
  durationMs: number
}

/** Run all providers. Failures are isolated per provider. */
export async function runReleaseSync(): Promise<FullSyncResult> {
  const start = Date.now()
  const results: ProviderSyncResult[] = []

  for (const provider of PROVIDERS) {
    const result = await runProvider(provider)
    results.push(result)
    // Short pause between providers to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 300))
  }

  return {
    providers:     results,
    totalInserted: results.reduce((s, r) => s + r.insertedCount, 0),
    totalUpdated:  results.reduce((s, r) => s + r.updatedCount, 0),
    totalFailed:   results.reduce((s, r) => s + r.failedCount, 0),
    durationMs:    Date.now() - start,
  }
}

/** Run a single provider by name. */
export async function runProviderByName(name: string): Promise<ProviderSyncResult | null> {
  const provider = PROVIDERS.find((p) => p.name === name)
  if (!provider) return null
  return runProvider(provider)
}

/** Get recent sync logs for the admin UI. */
export async function getRecentSyncLogs(limit = 20) {
  const logDelegate = getProductSyncLogDelegate()
  if (!logDelegate) return []

  try {
    return await logDelegate.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    })
  } catch (error) {
    if (isMissingProductSyncLogTableError(error)) return []
    throw error
  }
}

/**
 * Query products with filters and sorting.
 * Called from both the products page and the API route.
 */
export async function queryProducts(opts: {
  filter?: string    // 'all' | 'pokemon' | 'basketball' | 'sports' | 'tcg' | 'topps' | 'panini' | 'preorder' | 'coming-soon' | 'this-month' | 'new'
  sort?:   string    // 'release-date' | 'preorder-date' | 'newest' | 'manufacturer' | 'category'
  limit?:  number
} = {}) {
  const { filter = 'all', sort = 'release-date', limit = 200 } = opts
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const extendedStart = new Date(now)
  extendedStart.setMonth(extendedStart.getMonth() - 24)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  switch (filter) {
    case 'pokemon':      where.game = 'pokemon'; break
    case 'basketball':   where.sport = 'Basketball'; break
    case 'sports':       where.category = 'SPORTS'; break
    case 'tcg':          where.category = 'TCG'; break
    case 'topps':        where.manufacturer = { contains: 'Topps', mode: 'insensitive' }; break
    case 'panini':       where.manufacturer = { contains: 'Panini', mode: 'insensitive' }; break
    case 'beckett':      where.sourceName = 'beckett'; break
    case 'preorder':     where.productStatus = { in: ['PREORDER_OPEN', 'PREORDER_UPCOMING'] }; break
    case 'coming-soon':  where.productStatus = { in: ['COMING_SOON', 'ANNOUNCED'] }; break
    case 'this-month':
      where.OR = [
        { releaseDate:  { gte: now, lte: endOfMonth } },
        { preorderDate: { gte: now, lte: endOfMonth } },
      ]
      break
    case 'new':          where.isNew = true; break
    // 'all' — no filter
  }

  // Exclude archived by default
  if (!where.productStatus) {
    where.productStatus = { not: 'ARCHIVED' }
  }

  // Default window: future or last month.
  // Includes release/preorder/announcement dates so pre-announced products are not hidden.
  // Extended window: keep Pokemon and key Topps/Bowman lines visible for discovery.
  where.AND = [
    ...(where.AND ?? []),
    {
      OR: [
        { releaseDate: { gte: now } },
        { releaseDate: { gte: startOfLastMonth, lt: startOfThisMonth } },
        { preorderDate: { gte: now } },
        { preorderDate: { gte: startOfLastMonth, lt: startOfThisMonth } },
        { announcementDate: { gte: now } },
        { announcementDate: { gte: startOfLastMonth, lt: startOfThisMonth } },
        {
          AND: [
            {
              OR: [
                { releaseDate: { gte: extendedStart } },
                { preorderDate: { gte: extendedStart } },
                { announcementDate: { gte: extendedStart } },
              ],
            },
            {
              OR: [
                { game: 'pokemon' },
                {
                  AND: [
                    { manufacturer: { contains: 'Topps', mode: 'insensitive' } },
                    {
                      OR: [
                        { sport: 'Basketball' },
                        { brand: { contains: 'Bowman', mode: 'insensitive' } },
                        { productLine: { contains: 'Bowman', mode: 'insensitive' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]

  const orderBy = (() => {
    switch (sort) {
      case 'preorder-date':
        return [{ preorderDate: 'asc' as const }, { releaseDate: 'asc' as const }]
      case 'newest':
        return [{ firstSeenAt: 'desc' as const }]
      case 'manufacturer':
        return [{ manufacturer: 'asc' as const }, { releaseDate: 'asc' as const }]
      case 'category':
        return [{ category: 'asc' as const }, { releaseDate: 'asc' as const }]
      case 'release-date':
      default:
        return [{ releaseDate: 'asc' as const }, { preorderDate: 'asc' as const }]
    }
  })()

  return prisma.productRelease.findMany({ where, orderBy, take: limit })
}
