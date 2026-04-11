import { prisma } from '@/lib/prisma'
import { buildFuseIndex, searchCatalog } from '@/lib/fuzzy'
import type { CardCatalog } from '@prisma/client'

let catalogCache: CardCatalog[] | null = null
let cacheBuiltAt: Date | null = null
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

async function getCatalog(): Promise<CardCatalog[]> {
  if (catalogCache && cacheBuiltAt && Date.now() - cacheBuiltAt.getTime() < CACHE_TTL_MS) {
    return catalogCache
  }

  catalogCache = await prisma.cardCatalog.findMany({ orderBy: { cardName: 'asc' } })
  cacheBuiltAt = new Date()
  buildFuseIndex(catalogCache)
  return catalogCache
}

export async function searchCards(query: string, limit = 12): Promise<CardCatalog[]> {
  if (!query || query.trim().length < 2) return []

  const catalog = await getCatalog()
  const results = searchCatalog(query.trim(), catalog, limit)
  return results.map((r) => r.item)
}

export async function getCardById(id: string): Promise<CardCatalog | null> {
  return prisma.cardCatalog.findUnique({ where: { id } })
}

export async function addCardToCatalog(
  data: Omit<CardCatalog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CardCatalog> {
  const card = await prisma.cardCatalog.create({ data })
  catalogCache = null  // invalidate cache
  return card
}

export async function invalidateCatalogCache(): Promise<void> {
  catalogCache = null
  cacheBuiltAt = null
}
