/**
 * SNKRDUNK (スニーカーダンク) sold-price provider
 *
 * Calls the Puppeteer scraper at scripts/snkrdunk-scraper/query-price.js as a child process.
 * Falls back to the legacy HTTP-scrape approach when the scraper is not available
 * (e.g. in Vercel serverless where Puppeteer/Chrome can't run).
 *
 * Environment variables:
 *   SNKRDUNK_SCRAPER_PATH  — absolute path to query-price.js (optional, auto-resolved)
 *   SNKRDUNK_JPY_USD_RATE  — JPY→USD conversion rate (default 0.0067 ≈ 149 JPY/USD)
 *   SNKRDUNK_CACHE_TTL     — cache TTL in minutes before re-scraping (default 60)
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'
import { guessCondition, buildTcgQuery, buildSportsQuery } from './utils'
import path from 'path'

const LIMIT = 5
const JPY_RATE = parseFloat(process.env.SNKRDUNK_JPY_USD_RATE ?? '0.0067')

function jpyToUsd(jpy: number): number {
  return Math.round(jpy * JPY_RATE * 100) / 100
}

// ── Puppeteer scraper (local dev / self-hosted) ───────────────────────────────

type ScraperResult = {
  source: 'cache' | 'live'
  data: ScraperProduct | ScraperProduct[]
  error?: string
}

type ScraperProduct = {
  name: string
  name_ja?: string | null
  min_price_jpy: number | null
  min_price_usd: number | null
  display_price: string | null
  image_url: string | null
  product_url: string | null
  product_id: string | null
  condition: string | null
  listing_count: number | null
}

async function fetchViaScraper(query: string): Promise<NormalizedComp[] | null> {
  // Scraper path: env var or auto-resolve relative to this file's project root
  const scraperPath = process.env.SNKRDUNK_SCRAPER_PATH
    ?? path.resolve(process.cwd(), 'scripts/snkrdunk-scraper/query-price.js')

  try {
    // Dynamic import of child_process (not available in edge runtime)
    const { execFileSync } = await import('child_process')

    const stdout = execFileSync(
      process.execPath,  // node binary
      [scraperPath, `--query=${query}`, `--top=${LIMIT}`],
      {
        timeout: 45_000,   // 45 s — Puppeteer + page load
        maxBuffer: 1024 * 1024,
        env: { ...process.env },
      },
    )

    const parsed: ScraperResult = JSON.parse(stdout.toString())
    if (parsed.error) return null

    const items: ScraperProduct[] = Array.isArray(parsed.data)
      ? parsed.data
      : [parsed.data]

    return items
      .filter((p) => p.min_price_jpy)
      .map((p) => ({
        title:          p.name,
        soldPrice:      p.min_price_usd ?? jpyToUsd(p.min_price_jpy!),
        soldDate:       new Date(),
        currency:       'USD',
        source:         'snkrdunk',
        url:            p.product_url ?? null,
        imageUrl:       p.image_url ?? null,
        conditionGuess: p.condition ?? guessCondition(p.name),
        gradeGuess:     null,
        confidenceScore: 0.75,
      }))
  } catch {
    return null
  }
}

// ── HTTP/HTML fallback (Vercel / no Puppeteer) ────────────────────────────────
// Used when the scraper process can't run. Less reliable but serverless-safe.

function parseJpy(raw: string): number {
  const m = raw.replace(/[¥,\s]/g, '').match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

async function fetchViaHttp(query: string): Promise<NormalizedComp[] | null> {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://snkrdunk.com/apparel-categories/25?department_name=hobby&keyword=${encoded}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null

    const html = await res.text()
    const comps: NormalizedComp[] = []

    // Try __NEXT_DATA__ JSON blob
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1])
        const items = extractFromNextData(data)
        if (items.length > 0) {
          for (const item of items.slice(0, LIMIT)) {
            const jpyPrice = parseJpy(String(item.minPrice ?? item.displayPrice ?? item.price ?? ''))
            if (jpyPrice === 0) continue
            comps.push({
              title:          item.name ?? item.localizedName ?? query,
              soldPrice:      jpyToUsd(jpyPrice),
              soldDate:       new Date(),
              currency:       'USD',
              source:         'snkrdunk',
              url:            item.id ? `https://snkrdunk.com/products/${item.id}` : null,
              imageUrl:       item.primaryMedia?.imageUrl ?? item.imageUrl ?? null,
              conditionGuess: item.condition ?? null,
              gradeGuess:     null,
              confidenceScore: 0.6,
            })
          }
          if (comps.length > 0) return comps
        }
      } catch { /* ignore */ }
    }

    // Regex fallback — ¥-price extraction
    const priceRe = /¥([\d,]+)/g
    let pm: RegExpExecArray | null
    let count = 0
    while ((pm = priceRe.exec(html)) !== null && count < LIMIT) {
      const jpy = parseJpy(`¥${pm[1]}`)
      if (jpy > 100) {
        comps.push({
          title:          query,
          soldPrice:      jpyToUsd(jpy),
          soldDate:       new Date(),
          currency:       'USD',
          source:         'snkrdunk',
          url:            url,
          imageUrl:       null,
          conditionGuess: null,
          gradeGuess:     null,
          confidenceScore: 0.4,
        })
        count++
      }
    }

    return comps.length > 0 ? comps : null
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromNextData(data: any): any[] {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) {
    if (data.length > 0 && data[0]?.minPrice !== undefined) return data
    const found: unknown[] = []
    data.forEach((v) => found.push(...extractFromNextData(v)))
    return found
  }
  for (const key of Object.keys(data)) {
    const child = data[key]
    if (child && typeof child === 'object') {
      const found = extractFromNextData(child)
      if (found.length > 0) return found
    }
  }
  return []
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const snkrdunkProvider: PricingProvider = {
  name: 'snkrdunk',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    return (await fetchViaScraper(query)) ?? (await fetchViaHttp(query)) ?? []
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()

    const query = item.category === 'SPORTS'
      ? buildSportsQuery(item as Parameters<typeof buildSportsQuery>[0])
      : buildTcgQuery(item)

    // Try Puppeteer scraper first, then HTTP fallback
    let comps = await fetchViaScraper(query)
    let source = 'snkrdunk-puppeteer'

    if (!comps || comps.length === 0) {
      comps = await fetchViaHttp(query)
      source = 'snkrdunk-http'
    }

    if (!comps || comps.length === 0) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'snkrdunk',
        fetchedAt,
        error: 'SNKRDUNK returned no results',
      }
    }

    return {
      comps: comps.slice(0, LIMIT),
      suggestedPrice: null,
      source,
      fetchedAt,
      error: null,
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
