/**
 * eBay Sold Listings provider — last 5–8 sold items via Puppeteer scraper.
 *
 * The eBay Finding API was shut down in 2023. Plain HTTP scraping is blocked by
 * Cloudflare. This provider instead calls the Puppeteer scraper at:
 *   scripts/snkrdunk-scraper/ebay-scraper.js
 *
 * The scraper launches a headless Chrome, loads the eBay completed-listings page,
 * and extracts sold prices from the rendered DOM.
 *
 * Requires: Node.js + Puppeteer installed in scripts/snkrdunk-scraper/
 * Works on: local dev, self-hosted servers, Railway/Render etc.
 * Does NOT work on: Vercel serverless (no Chrome binary allowed)
 *
 * Environment variables:
 *   EBAY_SCRAPER_PATH  — path to ebay-scraper.js (auto-resolved if omitted)
 *   EBAY_CACHE_TTL     — cache TTL in minutes (default 60)
 */
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'
import type { PricingProvider } from './types'
import { guessCondition, buildTcgQuery, buildSportsQuery, computeConfidence } from './utils'
import path from 'path'

const LIMIT = 5

// ── Category IDs for eBay search filtering ────────────────────────────────────
// 2536   = Non-Sport Trading Card Games (Pokemon, MTG, Yu-Gi-Oh, etc.)
// 261329 = Sports Trading Cards (NBA, NFL, MLB, etc.)
function getCategoryId(item: InventoryItem): string {
  return item.category === 'SPORTS' ? '261329' : '2536'
}

// ── Scraper result types ──────────────────────────────────────────────────────

type ScraperComp = {
  title:     string
  price_usd: number
  sold_date: string | null
  condition: string | null
  url:       string | null
  image_url: string | null
}

type ScraperResult = {
  source: 'cache' | 'ebay-puppeteer'
  data:   ScraperComp[]
  error?: string
}

// ── Call Puppeteer scraper ────────────────────────────────────────────────────

async function fetchViaPuppeteer(
  query:      string,
  categoryId: string,
): Promise<NormalizedComp[] | null> {
  const scraperPath = process.env.EBAY_SCRAPER_PATH
    ?? path.resolve(process.cwd(), 'scripts/snkrdunk-scraper/ebay-scraper.js')

  try {
    const { execFileSync } = await import('child_process')

    const stdout = execFileSync(
      process.execPath,
      [
        scraperPath,
        `--query=${query}`,
        `--limit=${LIMIT + 2}`,      // fetch a few extra to filter outliers
        `--category=${categoryId}`,
      ],
      {
        timeout: 60_000,             // 60 s — Puppeteer + eBay page load
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env },
      },
    )

    const parsed: ScraperResult = JSON.parse(stdout.toString())
    if (parsed.error || !parsed.data?.length) return null

    return parsed.data.map((c) => ({
      title:          c.title,
      soldPrice:      c.price_usd,
      soldDate:       c.sold_date ? new Date(c.sold_date) : null,
      currency:       'USD',
      source:         'ebay-sold',
      url:            c.url ?? null,
      imageUrl:       c.image_url ?? null,
      conditionGuess: c.condition ?? guessCondition(c.title),
      gradeGuess:     null,
      confidenceScore: 0.8,
    }))
  } catch {
    return null
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const ebaySoldScraperProvider: PricingProvider = {
  name: 'ebay-sold',

  async searchCard(query: string): Promise<NormalizedComp[]> {
    return (await fetchViaPuppeteer(query, '2536')) ?? []
  },

  async getLatestComps(item: InventoryItem): Promise<PricingProviderResult> {
    const fetchedAt = new Date()

    const query = item.category === 'SPORTS'
      ? buildSportsQuery(item as Parameters<typeof buildSportsQuery>[0])
      : buildTcgQuery(item)

    const categoryId = getCategoryId(item)
    const rawComps   = await fetchViaPuppeteer(query, categoryId)

    if (!rawComps || rawComps.length === 0) {
      return {
        comps: [],
        suggestedPrice: null,
        source: 'ebay-sold',
        fetchedAt,
        error: 'eBay scraper returned no sold listings. Ensure Puppeteer is installed: cd scripts/snkrdunk-scraper && npm install',
      }
    }

    const comps = rawComps.slice(0, LIMIT).map((c) => ({
      ...c,
      confidenceScore: computeConfidence(
        c.title,
        item as Parameters<typeof computeConfidence>[1],
      ),
    }))

    return {
      comps,
      suggestedPrice: null,   // pricingService computes from comps
      source: 'ebay-puppeteer',
      fetchedAt,
      error: null,
    }
  },

  async getSuggestedMarketPrice(item: InventoryItem): Promise<number | null> {
    const result = await this.getLatestComps(item)
    return result.suggestedPrice
  },
}
