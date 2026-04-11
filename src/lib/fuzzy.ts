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
      { name: 'cardName', weight: 0.4 },
      { name: 'normalizedSearchText', weight: 0.3 },
      { name: 'setName', weight: 0.15 },
      { name: 'cardNumber', weight: 0.1 },
      { name: 'variant', weight: 0.05 },
    ],
    threshold: 0.4,
    distance: 100,
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
  limit = 12
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

export function normalizeSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
