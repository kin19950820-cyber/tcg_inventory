import { prisma } from '@/lib/prisma'
import { manualPriceProvider } from '@/providers/pricing/manualPriceProvider'
import { ebaySoldScraperProvider } from '@/providers/pricing/ebaySoldScraperProvider'
import { snkrdunkProvider } from '@/providers/pricing/snkrdunkProvider'
import { cachedPriceProvider } from '@/providers/pricing/cachedPriceProvider'
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'

// ── Provider priority chain ───────────────────────────────────────────────────
// manual override → eBay sold (last 5) → SNKRDUNK sold (last 5) → cached price
// eBay uses Finding API when EBAY_APP_ID is set, otherwise HTML scrapes the sold page.
// SNKRDUNK prices are in JPY, converted to USD via SNKRDUNK_JPY_USD_RATE (default 0.0067).

// ── Statistical helpers ───────────────────────────────────────────────────────

function median(prices: number[]): number {
  if (prices.length === 0) return 0
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function average(prices: number[]): number {
  if (prices.length === 0) return 0
  return prices.reduce((s, p) => s + p, 0) / prices.length
}

/**
 * Remove comps whose price is more than 3× or less than 0.3× the median.
 * Only applies when there are enough comps to be statistically meaningful (≥3).
 */
function filterOutliers(comps: NormalizedComp[]): NormalizedComp[] {
  if (comps.length < 3) return comps
  const prices = comps.map((c) => c.soldPrice).filter((p) => p > 0)
  const med = median(prices)
  if (med === 0) return comps
  return comps.filter((c) => c.soldPrice >= med * 0.3 && c.soldPrice <= med * 3.0)
}

/**
 * Remove comps with very low confidence (< 0.2) when high-confidence comps exist.
 * This prevents obvious mismatches from polluting the price calculation.
 */
function filterLowConfidence(comps: NormalizedComp[]): NormalizedComp[] {
  if (comps.length === 0) return comps
  const scores = comps.map((c) => c.confidenceScore ?? 0.5)
  const maxScore = Math.max(...scores)
  if (maxScore < 0.4) return comps  // all comps are low-confidence; keep all
  return comps.filter((c) => (c.confidenceScore ?? 0.5) >= 0.2)
}

/**
 * Compute the suggested market price from a set of clean comps.
 *
 * Strategy:
 *  - Prefer median (robust against outliers that slipped through)
 *  - For single comps use the price directly
 *  - Weight recent comps slightly higher by averaging median + latest-3 average
 */
function computeSuggestedPrice(comps: NormalizedComp[]): number | null {
  const validPrices = comps
    .filter((c) => c.soldPrice > 0)
    .map((c) => c.soldPrice)

  if (validPrices.length === 0) return null

  const med = median(validPrices)

  // If we have enough comps, blend median with latest-3 average
  if (validPrices.length >= 3) {
    const byDate = [...comps]
      .filter((c) => c.soldDate != null)
      .sort((a, b) => (b.soldDate?.getTime() ?? 0) - (a.soldDate?.getTime() ?? 0))
    const latest3 = byDate.slice(0, 3).map((c) => c.soldPrice)
    if (latest3.length >= 2) {
      const recentAvg = average(latest3)
      return Math.round(((med * 0.6 + recentAvg * 0.4) * 100) / 100) / 100 * 100
        / 100  // round to cent
    }
  }

  return Math.round(med * 100) / 100
}

export type PriceStats = {
  median: number | null
  average: number | null
  latestSold: { price: number; date: Date | null; source: string } | null
  compCount: number
  highConfidenceCount: number
}

function computeStats(comps: NormalizedComp[]): PriceStats {
  const valid = comps.filter((c) => c.soldPrice > 0)
  if (valid.length === 0) {
    return { median: null, average: null, latestSold: null, compCount: 0, highConfidenceCount: 0 }
  }

  const prices = valid.map((c) => c.soldPrice)
  const byDate = [...valid]
    .filter((c) => c.soldDate != null)
    .sort((a, b) => (b.soldDate?.getTime() ?? 0) - (a.soldDate?.getTime() ?? 0))

  return {
    median: Math.round(median(prices) * 100) / 100,
    average: Math.round(average(prices) * 100) / 100,
    latestSold: byDate.length > 0
      ? { price: byDate[0].soldPrice, date: byDate[0].soldDate, source: byDate[0].source }
      : null,
    compCount: valid.length,
    highConfidenceCount: valid.filter((c) => (c.confidenceScore ?? 0) >= 0.6).length,
  }
}

// ── Core refresh logic ────────────────────────────────────────────────────────

export async function refreshPriceForItem(itemId: string): Promise<PricingProviderResult & { stats: PriceStats }> {
  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } })

  // 1. Manual override — always wins, no live fetch needed
  if (item.priceOverride != null) {
    const result = await manualPriceProvider.getLatestComps(item)
    return { ...result, stats: computeStats(result.comps) }
  }

  // 2. eBay sold comps (Finding API → HTML scrape fallback)
  let liveResult: PricingProviderResult | null = null
  try {
    const ebayResult = await ebaySoldScraperProvider.getLatestComps(item)
    if (ebayResult.comps.length > 0) {
      liveResult = ebayResult
    }
  } catch {
    // fall through
  }

  // 3. SNKRDUNK sold comps (if eBay returned nothing)
  if (!liveResult) {
    try {
      const snkrResult = await snkrdunkProvider.getLatestComps(item)
      if (snkrResult.comps.length > 0) {
        liveResult = snkrResult
      }
    } catch {
      // fall through
    }
  }

  if (liveResult) {
    // Filter and compute price from live comps
    const cleaned = filterOutliers(filterLowConfidence(liveResult.comps))
    const suggestedPrice = computeSuggestedPrice(cleaned)
    const stats = computeStats(cleaned)

    const finalResult: PricingProviderResult = {
      ...liveResult,
      comps: cleaned,
      suggestedPrice,
    }

    await persistCompsAndPrice(itemId, cleaned, suggestedPrice, liveResult.source, liveResult.fetchedAt)

    return { ...finalResult, stats }
  }

  // 3. Cached price fallback — no DB write since nothing changed
  const cachedResult = await cachedPriceProvider.getLatestComps(item)
  return { ...cachedResult, stats: computeStats(cachedResult.comps) }
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function persistCompsAndPrice(
  itemId: string,
  comps: NormalizedComp[],
  suggestedPrice: number | null,
  source: string,
  fetchedAt: Date,
): Promise<void> {
  await prisma.$transaction([
    prisma.priceComp.deleteMany({ where: { inventoryItemId: itemId } }),
    prisma.priceComp.createMany({
      data: comps.map((c) => ({
        inventoryItemId: itemId,
        title: c.title,
        soldPrice: c.soldPrice,
        soldDate: c.soldDate,
        currency: c.currency,
        source: c.source,
        url: c.url,
        imageUrl: c.imageUrl ?? null,
        conditionGuess: c.conditionGuess,
        gradeGuess: c.gradeGuess,
      })),
    }),
  ])

  if (suggestedPrice != null) {
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        latestMarketPrice: suggestedPrice,
        latestMarketSource: source,
        latestMarketCheckedAt: fetchedAt,
      },
    })
  }
}

// ── Bulk refresh ──────────────────────────────────────────────────────────────

export async function refreshAllPrices(): Promise<{ updated: number; errors: number }> {
  const items = await prisma.inventoryItem.findMany({ where: { quantity: { gt: 0 } } })
  let updated = 0
  let errors = 0

  for (const item of items) {
    try {
      await refreshPriceForItem(item.id)
      updated++
    } catch {
      errors++
    }
  }

  return { updated, errors }
}

// ── Comp reader ───────────────────────────────────────────────────────────────

export async function getCompsForItem(itemId: string): Promise<NormalizedComp[]> {
  const comps = await prisma.priceComp.findMany({
    where: { inventoryItemId: itemId },
    orderBy: { soldDate: 'desc' },
  })

  return comps.map((c) => ({
    title: c.title,
    soldPrice: c.soldPrice,
    soldDate: c.soldDate,
    currency: c.currency,
    source: c.source,
    url: c.url,
    imageUrl: c.imageUrl,
    conditionGuess: c.conditionGuess,
    gradeGuess: c.gradeGuess,
  }))
}

// ── Manual override helpers ───────────────────────────────────────────────────

export async function setManualPriceOverride(
  itemId: string,
  price: number,
  note?: string,
): Promise<InventoryItem> {
  return prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      priceOverride: price,
      priceOverrideNote: note ?? null,
      latestMarketPrice: price,
      latestMarketSource: 'manual',
      latestMarketCheckedAt: new Date(),
    },
  })
}

export async function clearManualPriceOverride(itemId: string): Promise<InventoryItem> {
  return prisma.inventoryItem.update({
    where: { id: itemId },
    data: { priceOverride: null, priceOverrideNote: null },
  })
}
