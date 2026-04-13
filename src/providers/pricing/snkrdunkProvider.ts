/**
 * SNKRDUNK (スニーカーダンク) sold-price provider
 *
 * SNKRDUNK is a Japanese TCG marketplace (Pokemon, One Piece, Duel Masters).
 * English card name search WORKS when using Puppeteer because the site is
 * internationalized — it was only returning wrong results via static HTTP fetch
 * (which can't execute JavaScript and shows generic recommended items).
 *
 * Sports cards (NBA, MLB etc.) are NOT listed on SNKRDUNK at all.
 *
 * Pricing is in JPY, converted to USD.
 *
 * Environment variables:
 *   SNKRDUNK_SCRAPER_PATH  — path to query-price.js (auto-resolved if omitted)
 *   SNKRDUNK_JPY_USD_RATE  — JPY→USD rate (default 0.0067 ≈ 149 JPY/USD)
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'
import { guessCondition, buildTcgQuery } from './utils'
import path from 'path'

const LIMIT    = 5
const JPY_RATE = parseFloat(process.env.SNKRDUNK_JPY_USD_RATE ?? '0.0067')

function jpyToUsd(jpy: number): number {
  return Math.round(jpy * JPY_RATE * 100) / 100
}

// ── Build SNKRDUNK search query ───────────────────────────────────────────────

function buildSnkrdunkQuery(item: InventoryItem): string | null {
  // Sports cards are not on SNKRDUNK
  if (item.category === 'SPORTS') return null

  // If the item is a Japanese card, the card name may already be in Japanese
  // which is ideal. Otherwise use the English name — SNKRDUNK supports both.
  const parts: string[] = [item.cardName]

  // For Japanese cards, also append the set name (often in Japanese already)
  if (item.language === 'JA' && item.setName) {
    parts.push(item.setName)
  }

  // For English cards, append card number to narrow results
  if (item.language !== 'JA' && item.cardNumber) {
    parts.push(item.cardNumber)
  }

  return parts.filter(Boolean).join(' ')
}

// ── Puppeteer scraper call ────────────────────────────────────────────────────

type ScraperResult = {
  source: 'cache' | 'live'
  data:   ScraperProduct | ScraperProduct[]
  error?: string
}

type ScraperProduct = {
  name:          string
  name_ja?:      string | null
  min_price_jpy: number | null
  min_price_usd: number | null
  display_price: string | null
  image_url:     string | null
  product_url:   string | null
  product_id:    string | null
  condition:     string | null
  listing_count: number | null
}

async function fetchViaScraper(query: string): Promise<NormalizedComp[] | null> {
  const scraperPath = process.env.SNKRDUNK_SCRAPER_PATH
    ?? path.resolve(process.cwd(), 'scripts/snkrdunk-scraper/query-price.js')

  try {
    const { execFileSync } = await import('child_process')

    const stdout = execFileSync(
      process.execPath,
      [scraperPath, `--query=${query}`, `--top=${LIMIT}`],
      {
        timeout: 45_000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env },
      },
    )

    const parsed: ScraperResult = JSON.parse(stdout.toString())
    if (parsed.error) return null

    const items: ScraperProduct[] = Array.isArray(parsed.data) ? parsed.data : [parsed.data]

    return items
      .filter((p) => p.min_price_jpy)
      .map((p) => ({
        title:           p.name,
        soldPrice:       p.min_price_usd ?? jpyToUsd(p.min_price_jpy!),
        soldDate:        new Date(),
        currency:        'USD',
        source:          'snkrdunk',
        url:             p.product_url ?? null,
        imageUrl:        p.image_url ?? null,
        conditionGuess:  p.condition ?? guessCondition(p.name),
        gradeGuess:      null,
        confidenceScore: 0.75,
      }))
  } catch {
    return null
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const snkrdunkProvider: PricingProvider = {
  name: 'snkrdunk',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    return (await fetchViaScraper(query)) ?? []
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()

    if (item.category === 'SPORTS') {
      return {
        comps: [], suggestedPrice: null, source: 'snkrdunk', fetchedAt,
        error: 'SNKRDUNK is a Japanese TCG marketplace — sports cards are not listed',
      }
    }

    const query = buildSnkrdunkQuery(item)
    if (!query) {
      return {
        comps: [], suggestedPrice: null, source: 'snkrdunk', fetchedAt,
        error: 'Could not build SNKRDUNK query for this item',
      }
    }

    const comps = await fetchViaScraper(query)

    if (!comps || comps.length === 0) {
      return {
        comps: [], suggestedPrice: null, source: 'snkrdunk', fetchedAt,
        error: `SNKRDUNK: no results for "${query}"`,
      }
    }

    return { comps: comps.slice(0, LIMIT), suggestedPrice: null, source: 'snkrdunk-puppeteer', fetchedAt, error: null }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
