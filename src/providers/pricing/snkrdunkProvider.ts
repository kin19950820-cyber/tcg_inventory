/**
 * SNKRDUNK (スニーカーダンク) sold-price provider
 *
 * Scrapes the SNKRDUNK trading-card market for recently sold prices.
 * SNKRDUNK is a Japanese C2C marketplace widely used for Pokemon/TCG cards.
 *
 * No credentials required — uses public search pages.
 *
 * URL pattern:
 *   https://snkrdunk.com/trading-cards/search?keyword={query}
 *
 * Note: SNKRDUNK's site is primarily in Japanese. Prices are in JPY.
 * USD conversion uses the SNKRDUNK_JPY_USD_RATE env var (default 0.0067 ≈ 149 JPY/USD).
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'
import { guessCondition, buildTcgQuery, buildSportsQuery } from './utils'

const LIMIT = 5

// Approximate JPY→USD rate. Set SNKRDUNK_JPY_USD_RATE in .env to override.
function jpyToUsd(jpy: number): number {
  const rate = parseFloat(process.env.SNKRDUNK_JPY_USD_RATE ?? '0.0067')
  return Math.round(jpy * rate * 100) / 100
}

/**
 * Extract a numeric price from a string that may contain ¥ or commas.
 * e.g. "¥12,800" → 12800
 */
function parseJpy(raw: string): number {
  const m = raw.replace(/[¥,\s]/g, '').match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

async function fetchSnkrdunk(query: string): Promise<NormalizedComp[] | null> {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://snkrdunk.com/trading-cards/search?keyword=${encoded}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })

    if (!res.ok) return null

    const html = await res.text()
    const comps: NormalizedComp[] = []

    // SNKRDUNK renders sold items in a list. Look for price patterns in the page.
    // The page contains JSON-LD or data blocks with card listings.

    // Try to extract from embedded JSON (Next.js __NEXT_DATA__)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1])
        // Walk the props tree to find trading card items
        const items = extractSnkrdunkItems(data)
        if (items.length > 0) {
          for (const item of items.slice(0, LIMIT)) {
            const jpyPrice = parseJpy(item.price ?? '')
            if (jpyPrice === 0) continue
            comps.push({
              title: item.name ?? item.title ?? query,
              soldPrice: jpyToUsd(jpyPrice),
              soldDate: item.soldAt ? new Date(item.soldAt) : null,
              currency: 'USD',   // converted from JPY
              source: 'snkrdunk',
              url: item.url ?? `https://snkrdunk.com/trading-cards/${item.id}`,
              imageUrl: item.imageUrl ?? item.image ?? null,
              conditionGuess: item.condition ?? guessCondition(item.name ?? ''),
              gradeGuess: null,
              confidenceScore: 0.7,
            })
          }
          if (comps.length > 0) return comps
        }
      } catch {
        // JSON parse failed — fall through to regex scrape
      }
    }

    // Regex fallback: look for price/name patterns in the HTML
    // SNKRDUNK typically shows prices like ¥12,800 next to card names
    const priceRe = /¥([\d,]+)/g
    const titleRe = /<(?:h[1-6]|p|span)[^>]*class="[^"]*(?:name|title|product)[^"]*"[^>]*>([^<]{5,})<\/(?:h[1-6]|p|span)>/gi

    const prices: number[] = []
    const titles: string[] = []

    let pm: RegExpExecArray | null
    while ((pm = priceRe.exec(html)) !== null && prices.length < LIMIT) {
      const v = parseJpy(`¥${pm[1]}`)
      if (v > 0) prices.push(v)
    }

    let tm: RegExpExecArray | null
    while ((tm = titleRe.exec(html)) !== null && titles.length < LIMIT) {
      const t = tm[1].trim()
      if (t && t.length > 3) titles.push(t)
    }

    for (let i = 0; i < Math.min(prices.length, LIMIT); i++) {
      comps.push({
        title: titles[i] ?? query,
        soldPrice: jpyToUsd(prices[i]),
        soldDate: null,
        currency: 'USD',
        source: 'snkrdunk',
        url: `https://snkrdunk.com/trading-cards/search?keyword=${encoded}`,
        imageUrl: null,
        conditionGuess: null,
        gradeGuess: null,
        confidenceScore: 0.5,
      })
    }

    return comps.length > 0 ? comps : null
  } catch {
    return null
  }
}

/**
 * Walk Next.js page props looking for arrays of items that look like TCG listings.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSnkrdunkItems(data: any): any[] {
  if (!data || typeof data !== 'object') return []

  // Look for arrays that contain objects with a price field
  if (Array.isArray(data)) {
    if (data.length > 0 && data[0]?.price !== undefined) return data
  }

  for (const key of Object.keys(data)) {
    const child = data[key]
    if (child && typeof child === 'object') {
      const found = extractSnkrdunkItems(child)
      if (found.length > 0) return found
    }
  }
  return []
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const snkrdunkProvider: PricingProvider = {
  name: 'snkrdunk',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    return (await fetchSnkrdunk(query)) ?? []
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()

    const query =
      item.category === 'SPORTS'
        ? buildSportsQuery(item as Parameters<typeof buildSportsQuery>[0])
        : buildTcgQuery(item)

    const comps = await fetchSnkrdunk(query)

    if (!comps || comps.length === 0) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'snkrdunk',
        fetchedAt,
        error: 'SNKRDUNK returned no results (site structure may have changed)',
      }
    }

    return {
      comps: comps.slice(0, LIMIT),
      suggestedPrice: null,
      source: 'snkrdunk',
      fetchedAt,
      error: null,
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
