/**
 * eBay Sold Listings provider — last 5 sold items
 *
 * Two fetch strategies, used in priority order:
 *
 *  1. eBay Finding API (findCompletedItems + SoldItemsOnly)
 *     Requires: EBAY_APP_ID env var (free eBay developer account — no OAuth needed)
 *     Docs: https://developer.ebay.com/devzone/finding/CallRef/findCompletedItems.html
 *
 *  2. HTML scrape fallback — no credentials needed.
 *     Fetches the public eBay completed-listings search page and parses it with regex.
 *     Works without any API key; may occasionally fail if eBay blocks the server IP.
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'
import { guessCondition, buildTcgQuery, buildSportsQuery, computeConfidence } from './utils'

const LIMIT = 5

// ── eBay Finding API ──────────────────────────────────────────────────────────

type FindingItem = {
  itemId: string[]
  title: string[]
  viewItemURL: string[]
  galleryURL?: string[]
  sellingStatus: Array<{
    currentPrice: Array<{ '@currencyId': string; __value__: string }>
  }>
  listingInfo: Array<{ endTime: string[] }>
  condition?: Array<{ conditionDisplayName: string[] }>
}

async function fetchEbayFindingAPI(
  query: string,
  categoryId: string,
): Promise<NormalizedComp[] | null> {
  const appId = process.env.EBAY_APP_ID
  if (!appId) return null

  try {
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'keywords': query,
      'sortOrder': 'EndTimeSoonest',
      'categoryId': categoryId,
      'paginationInput.entriesPerPage': String(LIMIT),
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
    })

    const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null

    const json = await res.json()
    const result = json?.findCompletedItemsResponse?.[0]
    const items: FindingItem[] = result?.searchResult?.[0]?.item ?? []
    if (items.length === 0) return null

    return items.map((i) => {
      const priceRaw = i.sellingStatus?.[0]?.currentPrice?.[0]
      const price = parseFloat(priceRaw?.__value__ ?? '0')
      const currency = priceRaw?.['@currencyId'] ?? 'USD'
      const endTime = i.listingInfo?.[0]?.endTime?.[0]
      const title = i.title?.[0] ?? ''
      const url = i.viewItemURL?.[0] ?? null
      const imageUrl = i.galleryURL?.[0] ?? null
      return {
        title,
        soldPrice: price,
        soldDate: endTime ? new Date(endTime) : null,
        currency,
        source: 'ebay-sold',
        url,
        imageUrl,
        conditionGuess: i.condition?.[0]?.conditionDisplayName?.[0] ?? guessCondition(title),
        gradeGuess: null,
        confidenceScore: 0.8,
      }
    })
  } catch {
    return null
  }
}

// ── eBay HTML scrape fallback ─────────────────────────────────────────────────

/**
 * Extract a dollar amount like $25.99 or $1,200.00 from a snippet of HTML.
 */
function extractPrice(html: string): number {
  const m = html.match(/\$([\d,]+\.?\d*)/)
  if (!m) return 0
  return parseFloat(m[1].replace(/,/g, ''))
}

/**
 * Parse a date string like "Sep 12, 2024" from eBay's "Sold" badge.
 */
function parseEbayDate(raw: string): Date | null {
  try {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

async function fetchEbayHtmlScrape(query: string): Promise<NormalizedComp[] | null> {
  try {
    const encoded = encodeURIComponent(query)
    // LH_Sold=1 & LH_Complete=1 = completed/sold listings, _sop=13 = most recently ended
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=10`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null

    const html = await res.text()

    // eBay renders each listing inside <li class="s-item ...">...</li>
    // We extract the s-item blocks and parse price / title / date from each
    const itemBlocks: string[] = []
    const liRe = /<li[^>]*class="[^"]*s-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
    let m: RegExpExecArray | null
    while ((m = liRe.exec(html)) !== null && itemBlocks.length < LIMIT + 2) {
      itemBlocks.push(m[1])
    }

    const comps: NormalizedComp[] = []

    for (const block of itemBlocks) {
      // Skip the first "dummy" placeholder eBay always renders
      if (block.includes('id="s-item__wrapper"') || block.includes('Shop on eBay')) continue

      // Title
      const titleM = block.match(/<span[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([^<]+)<\/span>/)
      const title = titleM ? titleM[1].trim() : ''
      if (!title || title === 'Shop on eBay') continue

      // Price — <span class="s-item__price"><span class="POSITIVE">$XX.XX</span>
      const priceM = block.match(/<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]*?)<\/span\s*>/)
      const price = priceM ? extractPrice(priceM[1]) : 0
      if (price === 0) continue

      // Sold date — eBay renders something like: >Sold  Oct 5, 2024<
      const dateM = block.match(/Sold\s+(\w{3}\s+\d{1,2},\s+\d{4})/)
      const soldDate = dateM ? parseEbayDate(dateM[1]) : null

      // URL
      const urlM = block.match(/href="(https:\/\/www\.ebay\.com\/itm\/[^"]+)"/)
      const itemUrl = urlM ? urlM[1].split('?')[0] : null

      // Image
      const imgM = block.match(/src="(https:\/\/i\.ebayimg\.com[^"]+)"/)
      const imageUrl = imgM ? imgM[1] : null

      comps.push({
        title,
        soldPrice: price,
        soldDate,
        currency: 'USD',
        source: 'ebay-sold',
        url: itemUrl,
        imageUrl,
        conditionGuess: guessCondition(title),
        gradeGuess: null,
        confidenceScore: 0.6,
      })

      if (comps.length >= LIMIT) break
    }

    return comps.length > 0 ? comps : null
  } catch {
    return null
  }
}

// ── Category mapping ──────────────────────────────────────────────────────────
// 2536   = Non-Sport Trading Card Games (TCG)
// 261329 = Sports Trading Cards

function getCategoryId(item: InventoryItem): string {
  return item.category === 'SPORTS' ? '261329' : '2536'
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const ebaySoldScraperProvider: PricingProvider = {
  name: 'ebay-sold',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    const comps =
      (await fetchEbayFindingAPI(query, '2536')) ??
      (await fetchEbayHtmlScrape(query)) ??
      []
    return comps.slice(0, LIMIT)
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()

    const query =
      item.category === 'SPORTS'
        ? buildSportsQuery(item as Parameters<typeof buildSportsQuery>[0])
        : buildTcgQuery(item)

    const categoryId = getCategoryId(item)

    // Try Finding API first (structured, accurate), fall back to HTML scrape
    let rawComps: NormalizedComp[] | null =
      await fetchEbayFindingAPI(query, categoryId)

    let strategy = 'ebay-finding-api'

    if (!rawComps || rawComps.length === 0) {
      rawComps = await fetchEbayHtmlScrape(query)
      strategy = 'ebay-html-scrape'
    }

    if (!rawComps || rawComps.length === 0) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'ebay-sold',
        fetchedAt,
        error: process.env.EBAY_APP_ID
          ? 'eBay returned no sold listings for this query'
          : 'Set EBAY_APP_ID for reliable results. HTML scrape also returned nothing.',
      }
    }

    // Attach confidence scores
    const comps = rawComps.slice(0, LIMIT).map((c) => ({
      ...c,
      confidenceScore:
        c.confidenceScore ??
        computeConfidence(c.title, item as Parameters<typeof computeConfidence>[1]),
    }))

    return {
      comps,
      suggestedPrice: null, // pricingService computes this from comps
      source: strategy,
      fetchedAt,
      error: null,
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
