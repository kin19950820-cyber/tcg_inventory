/**
 * Manual price override provider.
 *
 * When an item has a priceOverride set, this provider is called first and
 * short-circuits the provider chain. confidence score is always 1.0 —
 * the user explicitly set this value.
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'

export const manualPriceProvider: PricingProvider = {
  name: 'manual',

  async searchCard(_query: string): Promise<NormalizedComp[]> {
    return []
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()

    if (!item.priceOverride) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'manual',
        fetchedAt,
        error: 'No manual price override set',
      }
    }

    const note = item.priceOverrideNote ? `: ${item.priceOverrideNote}` : ''
    const comp: NormalizedComp = {
      title: `Manual override${note}`,
      soldPrice: item.priceOverride,
      soldDate: item.updatedAt,
      currency: item.latestMarketCurrency ?? 'USD',
      source: 'manual',
      url: null,
      imageUrl: null,
      conditionGuess: item.conditionRaw ?? (item.grade ? `${item.gradingCompany} ${item.grade}` : null),
      gradeGuess: item.grade ?? null,
      confidenceScore: 1.0,
    }

    return {
      comps: [comp],
      suggestedPrice: item.priceOverride,
      source: 'manual',
      fetchedAt,
      error: null,
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    return item.priceOverride ?? null
  },
}
