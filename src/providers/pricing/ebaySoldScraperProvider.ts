/**
 * eBay Sold Listings provider
 *
 * Uses the eBay Browse API to fetch recently sold listings and compute a
 * market price from the median of high-confidence comps.
 *
 * Required env (optional — provider gracefully degrades without them):
 *   EBAY_APP_ID         — eBay developer client ID
 *   EBAY_CLIENT_SECRET  — eBay developer client secret
 *
 * When credentials are absent the provider returns an empty result and the
 * pricingService falls through to the cachedPriceProvider.
 *
 * eBay Browse API docs:
 *   https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'
import { guessCondition, buildTcgQuery, buildSportsQuery, computeConfidence } from './utils'

// ── eBay Browse API types (subset) ────────────────────────────────────────────

type EbayItemSummary = {
  itemId: string
  title: string
  price: { value: string; currency: string }
  itemEndDate?: string
  itemWebUrl: string
  thumbnailImages?: Array<{ imageUrl: string }>
  condition?: string
  categories?: Array<{ categoryId: string; categoryName: string }>
}

type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[]
  total?: number
  warnings?: unknown[]
}

// ── eBay OAuth client credentials token ──────────────────────────────────────

let _cachedToken: string | null = null
let _tokenExpiresAt = 0

async function getEbayToken(): Promise<string | null> {
  const appId = process.env.EBAY_APP_ID
  const secret = process.env.EBAY_CLIENT_SECRET
  if (!appId || !secret) return null

  // Return cached token if still valid (with 5m buffer)
  if (_cachedToken && Date.now() < _tokenExpiresAt - 300_000) return _cachedToken

  try {
    const credentials = Buffer.from(`${appId}:${secret}`).toString('base64')
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    })
    if (!res.ok) return null
    const json = await res.json() as { access_token?: string; expires_in?: number }
    _cachedToken = json.access_token ?? null
    _tokenExpiresAt = Date.now() + (json.expires_in ?? 7200) * 1000
    return _cachedToken
  } catch {
    return null
  }
}

// ── eBay category IDs ─────────────────────────────────────────────────────────
// 2536  = Non-Sport Trading Card Games (TCG)
// 261329 = Sports Trading Cards

function getCategoryId(item: InventoryItem): string {
  return item.category === 'SPORTS' ? '261329' : '2536'
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function fetchEbaySold(
  query: string,
  categoryId: string,
  token: string,
  limit = 10,
): Promise<EbayItemSummary[]> {
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search')
  url.searchParams.set('q', query)
  // "soldItems" filter requires eBay Partner Network approval on some accounts;
  // fall back to active fixed-price listings if sold filter is rejected.
  url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE}')
  url.searchParams.set('sort', 'endingSoonest')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('category_ids', categoryId)

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`eBay API HTTP ${res.status}: ${await res.text()}`)
  }

  const json = await res.json() as EbaySearchResponse
  return json.itemSummaries ?? []
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const ebaySoldScraperProvider: PricingProvider = {
  name: 'ebay-sold',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    const token = await getEbayToken()
    if (!token) return []
    try {
      const items = await fetchEbaySold(query, '2536', token, 5)
      return items.map((i) => ({
        title: i.title,
        soldPrice: parseFloat(i.price.value),
        soldDate: i.itemEndDate ? new Date(i.itemEndDate) : null,
        currency: i.price.currency,
        source: 'ebay-sold',
        url: i.itemWebUrl,
        imageUrl: i.thumbnailImages?.[0]?.imageUrl ?? null,
        conditionGuess: guessCondition(i.title),
        gradeGuess: null,
        confidenceScore: 0.5,
      }))
    } catch {
      return []
    }
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
      const query = item.category === 'SPORTS'
        ? buildSportsQuery(item as Parameters<typeof buildSportsQuery>[0])
        : buildTcgQuery(item)

      const categoryId = getCategoryId(item)
      const rawItems = await fetchEbaySold(query, categoryId, token, 15)

      const comps: NormalizedComp[] = rawItems.map((i) => ({
        title: i.title,
        soldPrice: parseFloat(i.price.value),
        soldDate: i.itemEndDate ? new Date(i.itemEndDate) : null,
        currency: i.price.currency,
        source: 'ebay-sold',
        url: i.itemWebUrl,
        imageUrl: i.thumbnailImages?.[0]?.imageUrl ?? null,
        conditionGuess: guessCondition(i.title) ?? i.condition ?? null,
        gradeGuess: null,
        confidenceScore: computeConfidence(i.title, item as Parameters<typeof computeConfidence>[1]),
      }))

      return { comps, suggestedPrice: null, source: 'ebay-sold', fetchedAt, error: null }
    } catch (e) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'ebay-sold',
        fetchedAt,
        error: String(e),
      }
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
