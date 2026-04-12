/**
 * Cached price provider — fallback of last resort.
 *
 * Returns the item's currently stored latestMarketPrice as a single comp.
 * This ensures the app always has *some* price to display even when all
 * live providers are unavailable (no API keys, network errors, etc.).
 *
 * confidence score: 0.4 — stale by definition; use for display only.
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'

export const cachedPriceProvider: PricingProvider = {
  name: 'cached',

  async searchCard(_query: string): Promise<NormalizedComp[]> {
    return []
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()

    if (item.latestMarketPrice == null) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'cached',
        fetchedAt,
        error: 'No cached price available',
      }
    }

    const checkedAt = item.latestMarketCheckedAt
    const ageMs = checkedAt ? Date.now() - checkedAt.getTime() : null
    const ageDays = ageMs != null ? Math.round(ageMs / 86400000) : null
    const ageLabel = ageDays != null ? ` (${ageDays}d old)` : ''

    const comp: NormalizedComp = {
      title: `Cached price from ${item.latestMarketSource ?? 'unknown'}${ageLabel}`,
      soldPrice: item.latestMarketPrice,
      soldDate: checkedAt ?? null,
      currency: item.latestMarketCurrency ?? 'USD',
      source: 'cached',
      url: null,
      imageUrl: null,
      conditionGuess: item.conditionRaw ?? (item.grade ? `${item.gradingCompany} ${item.grade}` : null),
      gradeGuess: item.grade ?? null,
      confidenceScore: 0.4,
    }

    return {
      comps: [comp],
      suggestedPrice: item.latestMarketPrice,
      source: 'cached',
      fetchedAt,
      error: null,
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    return item.latestMarketPrice ?? null
  },
}
