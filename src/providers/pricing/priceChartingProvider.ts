/**
 * PriceCharting provider
 * Docs: https://www.pricecharting.com/api
 *
 * Required env: PRICECHARTING_API_KEY
 *
 * Without an API key, falls back to mock data so the rest of the app still works.
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'

const BASE = 'https://www.pricecharting.com/api'

function buildSearchQuery(item: InventoryItem): string {
  const parts = [item.cardName]
  if (item.setName) parts.push(item.setName)
  if (item.cardNumber) parts.push(item.cardNumber)
  if (item.grade) parts.push(`PSA ${item.grade}`)
  return parts.join(' ')
}

// guessCondition moved to utils.ts — re-export for any callers
export { guessCondition } from './utils'

// Mock comps used when no API key is configured
function mockComps(item: InventoryItem): NormalizedComp[] {
  const base = item.latestMarketPrice ?? item.purchasePrice * 1.2
  return [
    {
      title: `${item.cardName} ${item.setName ?? ''} - Sold listing 1`.trim(),
      soldPrice: base * 0.95,
      soldDate: new Date(Date.now() - 3 * 86400000),
      currency: 'USD',
      source: 'pricecharting-mock',
      url: null,
      imageUrl: item.imageUrl,
      conditionGuess: item.conditionRaw ?? 'NM',
      gradeGuess: item.grade ?? null,
    },
    {
      title: `${item.cardName} ${item.setName ?? ''} - Sold listing 2`.trim(),
      soldPrice: base * 1.05,
      soldDate: new Date(Date.now() - 7 * 86400000),
      currency: 'USD',
      source: 'pricecharting-mock',
      url: null,
      imageUrl: item.imageUrl,
      conditionGuess: item.conditionRaw ?? 'NM',
      gradeGuess: item.grade ?? null,
    },
  ]
}

export const priceChartingProvider: PricingProvider = {
  name: 'pricecharting',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    const key = process.env.PRICECHARTING_API_KEY
    if (!key) return []

    try {
      const url = `${BASE}/products?id=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) return []
      const json = await res.json()
      // PriceCharting search returns product list, not sold comps
      return (json.products ?? []).slice(0, 5).map((p: Record<string, unknown>) => ({
        title: String(p['product-name'] ?? ''),
        soldPrice: Number(p['loose-price'] ?? 0) / 100,
        soldDate: null,
        currency: 'USD',
        source: 'pricecharting',
        url: `https://www.pricecharting.com/game/${p['console-name']}/${p.id}`,
        imageUrl: null,
        conditionGuess: 'ungraded',
        gradeGuess: null,
      }))
    } catch {
      return []
    }
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const key = process.env.PRICECHARTING_API_KEY
    const fetchedAt = new Date()

    if (!key) {
      const comps = mockComps(item)
      return {
        comps,
        suggestedPrice: comps.reduce((s, c) => s + c.soldPrice, 0) / comps.length,
        source: 'pricecharting-mock',
        fetchedAt,
        error: 'No PRICECHARTING_API_KEY configured — using mock data',
      }
    }

    try {
      const q = buildSearchQuery(item)
      const url = `${BASE}/product?id=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}`
      const res = await fetch(url, { cache: 'no-store' })

      if (!res.ok) {
        return { comps: mockComps(item), suggestedPrice: null, source: 'pricecharting', fetchedAt, error: `HTTP ${res.status}` }
      }

      const json = await res.json()

      // PriceCharting product endpoint returns price tiers, not individual sold listings
      // Map the grade-appropriate price as a single "comp"
      const graded = item.grade && item.gradingCompany === 'PSA'
      const price = graded
        ? Number(json[`psa-${item.grade}-price`] ?? json['graded-price'] ?? 0) / 100
        : Number(json['loose-price'] ?? json['complete-price'] ?? 0) / 100

      const comp: NormalizedComp = {
        title: String(json['product-name'] ?? item.cardName),
        soldPrice: price,
        soldDate: new Date(),
        currency: 'USD',
        source: 'pricecharting',
        url: json.id ? `https://www.pricecharting.com/game/${json['console-name']}/${json.id}` : null,
        imageUrl: null,
        conditionGuess: graded ? `PSA ${item.grade}` : (item.conditionRaw ?? 'ungraded'),
        gradeGuess: item.grade ?? null,
      }

      return { comps: [comp], suggestedPrice: price || null, source: 'pricecharting', fetchedAt, error: null }
    } catch (e) {
      return { comps: mockComps(item), suggestedPrice: null, source: 'pricecharting', fetchedAt, error: String(e) }
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
