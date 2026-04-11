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
      return { comps: [], suggestedPrice: null, source: 'manual', fetchedAt, error: 'No manual price override set' }
    }

    return {
      comps: [
        {
          title: `Manual override${item.priceOverrideNote ? `: ${item.priceOverrideNote}` : ''}`,
          soldPrice: item.priceOverride,
          soldDate: item.updatedAt,
          currency: item.latestMarketCurrency ?? 'USD',
          source: 'manual',
          url: null,
          imageUrl: null,
          conditionGuess: null,
          gradeGuess: null,
        },
      ],
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
