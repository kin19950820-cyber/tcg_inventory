/**
 * eBay Sold Listings scraper provider — SCAFFOLD
 *
 * Full implementation requires either:
 *   a) eBay Browse API (OAuth) — EBAY_APP_ID + OAuth token flow
 *   b) Playwright-based scraper (see MCP playwright server)
 *
 * Required env:
 *   EBAY_APP_ID      — eBay developer app ID
 *   EBAY_CLIENT_SECRET — for OAuth token exchange
 *
 * This scaffold returns mock data and documents the integration points.
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'
import { guessCondition } from './priceChartingProvider'

// ─── eBay Browse API types (subset) ──────────────────────────────────────────
type EbayItemSummary = {
  title: string
  price: { value: string; currency: string }
  itemEndDate: string
  itemWebUrl: string
  thumbnailImages?: Array<{ imageUrl: string }>
  condition?: string
}

async function getEbayToken(): Promise<string | null> {
  const appId = process.env.EBAY_APP_ID
  const secret = process.env.EBAY_CLIENT_SECRET
  if (!appId || !secret) return null

  const credentials = Buffer.from(`${appId}:${secret}`).toString('base64')
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    next: { revalidate: 7000 },  // tokens last ~2h
  })

  if (!res.ok) return null
  const json = await res.json()
  return json.access_token ?? null
}

function buildEbayQuery(item: InventoryItem): string {
  const parts = [item.cardName]
  if (item.setName) parts.push(item.setName)
  if (item.cardNumber) parts.push(item.cardNumber)
  if (item.gradingCompany && item.grade) parts.push(`${item.gradingCompany} ${item.grade}`)
  else if (item.conditionRaw) parts.push(item.conditionRaw)
  if (item.language && item.language !== 'EN') parts.push(item.language)
  return parts.join(' ')
}

export const ebaySoldScraperProvider: PricingProvider = {
  name: 'ebay-sold',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    // TODO: implement eBay keyword search via Browse API
    // GET https://api.ebay.com/buy/browse/v1/item_summary/search?q={query}&filter=buyingOptions:{FIXED_PRICE}&limit=5
    return []
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()
    const token = await getEbayToken()

    if (!token) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'ebay-sold',
        fetchedAt,
        error: 'No eBay credentials — set EBAY_APP_ID and EBAY_CLIENT_SECRET',
      }
    }

    try {
      const q = buildEbayQuery(item)
      // eBay Browse API: sold/completed listings filter
      const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search')
      url.searchParams.set('q', q)
      url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE},soldItems:{true}')
      url.searchParams.set('sort', 'endingSoonest')
      url.searchParams.set('limit', '10')
      url.searchParams.set('category_ids', '2536')  // Trading Card Games

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        return { comps: [], suggestedPrice: null, source: 'ebay-sold', fetchedAt, error: `eBay API HTTP ${res.status}` }
      }

      const json = await res.json()
      const items: EbayItemSummary[] = json.itemSummaries ?? []

      const comps: NormalizedComp[] = items.map((i) => ({
        title: i.title,
        soldPrice: parseFloat(i.price.value),
        soldDate: i.itemEndDate ? new Date(i.itemEndDate) : null,
        currency: i.price.currency,
        source: 'ebay-sold',
        url: i.itemWebUrl,
        imageUrl: i.thumbnailImages?.[0]?.imageUrl ?? null,
        conditionGuess: guessCondition(i.title) ?? i.condition ?? null,
        gradeGuess: null,
      }))

      const prices = comps.map((c) => c.soldPrice).filter((p) => p > 0)
      const suggestedPrice = prices.length
        ? prices.reduce((s, p) => s + p, 0) / prices.length
        : null

      return { comps, suggestedPrice, source: 'ebay-sold', fetchedAt, error: null }
    } catch (e) {
      return { comps: [], suggestedPrice: null, source: 'ebay-sold', fetchedAt, error: String(e) }
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
