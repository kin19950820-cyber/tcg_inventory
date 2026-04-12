import Fuse from 'fuse.js'
import type { CardCatalog } from '@prisma/client'

export type FuseCardResult = {
  item: CardCatalog
  score: number
  refIndex: number
}

let fuseInstance: Fuse<CardCatalog> | null = null
let catalogSnapshot: CardCatalog[] = []

export function buildFuseIndex(catalog: CardCatalog[]): Fuse<CardCatalog> {
  catalogSnapshot = catalog
  fuseInstance = new Fuse(catalog, {
    keys: [
      // Sports: player name is the primary key
      { name: 'playerName', weight: 0.30 },
      // TCG/Sports: card display name
      { name: 'cardName', weight: 0.25 },
      // Pre-computed search blob (all fields normalized)
      { name: 'normalizedSearchText', weight: 0.18 },
      // Set / product name (e.g. "Prizm Basketball", "Obsidian Flames")
      { name: 'setName', weight: 0.10 },
      // Brand (Prizm, Select, Chrome — high-value search term for sports)
      { name: 'brand', weight: 0.08 },
      // Card number
      { name: 'cardNumber', weight: 0.04 },
      // Parallel (Silver, Gold, etc.)
      { name: 'parallel', weight: 0.03 },
      // TCG variant (Alternate Art, Shadowless, etc.)
      { name: 'variant', weight: 0.02 },
    ],
    threshold: 0.4,
    distance: 120,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true,
    ignoreLocation: true,
  })
  return fuseInstance
}

export function searchCatalog(
  query: string,
  catalog?: CardCatalog[],
  limit = 12,
): FuseCardResult[] {
  if (!query || query.length < 2) return []

  if (catalog && catalog !== catalogSnapshot) {
    buildFuseIndex(catalog)
  }

  if (!fuseInstance) return []

  const results = fuseInstance.search(query, { limit })
  return results.map((r) => ({
    item: r.item,
    score: r.score ?? 1,
    refIndex: r.refIndex,
  }))
}

/**
 * Build the normalizedSearchText blob for a catalog entry.
 * For TCG cards: cardName + setName + cardNumber + variant + language + rarity
 * For sports cards: playerName + cardName + brand + season + parallel + insert +
 *                   teamName + manufacturer + league + cardNumber
 */
export function buildNormalizedSearchText(fields: {
  cardName?: string | null
  playerName?: string | null
  setName?: string | null
  cardNumber?: string | null
  variant?: string | null
  language?: string | null
  rarity?: string | null
  // sports
  brand?: string | null
  season?: string | null
  parallel?: string | null
  insertName?: string | null
  teamName?: string | null
  manufacturer?: string | null
  league?: string | null
  sport?: string | null
  productLine?: string | null
}): string {
  return [
    fields.playerName,
    fields.cardName,
    fields.brand,
    fields.season,
    fields.parallel,
    fields.insertName,
    fields.setName,
    fields.teamName,
    fields.manufacturer,
    fields.league,
    fields.sport,
    fields.productLine,
    fields.cardNumber,
    fields.variant,
    fields.language !== 'EN' ? fields.language : null,
    fields.rarity,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Legacy alias kept for backward compat (seed.ts uses this) */
export function normalizeSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
