import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'

export interface PricingProvider {
  name: string
  searchCard(query: string): Promise<NormalizedComp[]>
  getLatestComps(item: InventoryItem): Promise<PricingProviderResult>
  getSuggestedMarketPrice(item: InventoryItem): Promise<number | null>
}
