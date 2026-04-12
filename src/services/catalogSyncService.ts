/**
 * Orchestrates the daily catalog sync:
 *  1. Clean up invalid / stale records (removes "DOMINIAR"-style junk data)
 *  2. Upsert sports card catalog (curated static dataset)
 *  3. Fetch Pokemon cards from pokemontcg.io API and upsert
 *  4. Invalidate the in-memory search cache
 */

import { prisma } from '@/lib/prisma'
import { invalidateCatalogCache } from '@/services/cardSearchService'
import { SPORTS_CATALOG_ENTRIES } from '@/services/scrapers/sportsCardCatalog'
import {
  POKEMON_SYNC_SETS,
  fetchSetCards,
  mapPokemonCard,
} from '@/services/scrapers/pokemonTcgScraper'

export interface SyncResult {
  status: 'ok' | 'partial' | 'error'
  cleaned: number
  sportsUpserted: number
  pokemonFetched: number
  pokemonUpserted: number
  pokemonSetsProcessed: number
  pokemonSetsFailed: string[]
  durationMs: number
  error?: string
}

// ── Known-valid game values.  Records with other values are cleaned up. ───────
const VALID_GAMES = new Set([
  'pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana', 'other',
  'basketball', 'baseball', 'football', 'soccer', 'hockey',
  'tennis', 'f1', 'golf', 'mma', 'sports',
])

const VALID_CATEGORIES = new Set(['TCG', 'SPORTS', 'SEALED'])

// ── Step 1: cleanup ────────────────────────────────────────────────────────────

async function cleanupInvalidRecords(): Promise<number> {
  // Delete records whose game or category doesn't match known values.
  // This removes manually-entered junk like "DOMINIAR" from stale test sessions.
  const all = await prisma.cardCatalog.findMany({ select: { id: true, game: true, category: true, cardName: true } })

  const badIds = all
    .filter((r) => !VALID_GAMES.has(r.game) || !VALID_CATEGORIES.has(r.category))
    .map((r) => r.id)

  if (badIds.length > 0) {
    console.log(`[catalogSync] Cleaning ${badIds.length} invalid record(s):`, all.filter(r => badIds.includes(r.id)).map(r => `${r.cardName} (${r.game}/${r.category})`))
    await prisma.cardCatalog.deleteMany({ where: { id: { in: badIds } } })
  }

  return badIds.length
}

// ── Step 2: sports upsert ──────────────────────────────────────────────────────

async function upsertSportsCatalog(): Promise<number> {
  let count = 0
  for (const entry of SPORTS_CATALOG_ENTRIES) {
    const id = entry.id as string
    await prisma.cardCatalog.upsert({
      where: { id },
      update: {
        normalizedSearchText: entry.normalizedSearchText as string,
        teamName: entry.teamName ?? null,
        setName: entry.setName ?? null,
        parallel: entry.parallel ?? null,
        rookie: entry.rookie ?? false,
        season: entry.season ?? null,
        year: entry.year ?? null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: entry as any,
    })
    count++
  }
  return count
}

// ── Step 3: Pokemon fetch + upsert ────────────────────────────────────────────

async function syncPokemonSets(): Promise<{
  fetched: number
  upserted: number
  failedSets: string[]
}> {
  let totalFetched = 0
  let totalUpserted = 0
  const failedSets: string[] = []

  for (const setId of POKEMON_SYNC_SETS) {
    try {
      const cards = await fetchSetCards(setId)
      totalFetched += cards.length

      if (cards.length === 0) {
        // Set not yet released or ID is wrong — skip silently
        continue
      }

      // Batch upserts in chunks of 50 to avoid overwhelming the DB connection
      const CHUNK = 50
      for (let i = 0; i < cards.length; i += CHUNK) {
        const chunk = cards.slice(i, i + CHUNK)
        await Promise.all(
          chunk.map((card) => {
            const mapped = mapPokemonCard(card)
            return prisma.cardCatalog.upsert({
              where: { id: mapped.id },
              update: {
                imageUrl: mapped.imageUrl,
                rarity: mapped.rarity,
                variant: mapped.variant,
                normalizedSearchText: mapped.normalizedSearchText,
              },
              create: {
                ...mapped,
                sport: null,
                league: null,
                season: null,
                year: null,
                manufacturer: null,
                brand: null,
                productLine: null,
                subsetName: null,
                insertName: null,
                parallel: null,
                serialNumbered: false,
                autograph: false,
                memorabilia: false,
                rookie: false,
                playerName: null,
                teamName: null,
                serialNumber: null,
              },
            })
          }),
        )
        totalUpserted += chunk.length
      }

      console.log(`[catalogSync] ${setId}: ${cards.length} cards synced`)

      // Small delay between sets to be polite to the API
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      console.error(`[catalogSync] Failed set ${setId}:`, err)
      failedSets.push(setId)
    }
  }

  return { fetched: totalFetched, upserted: totalUpserted, failedSets }
}

// ── Public entry point ─────────────────────────────────────────────────────────

export async function runCatalogSync(): Promise<SyncResult> {
  const start = Date.now()

  try {
    console.log('[catalogSync] Starting catalog sync...')

    const cleaned = await cleanupInvalidRecords()
    console.log(`[catalogSync] Cleanup done: ${cleaned} removed`)

    const sportsUpserted = await upsertSportsCatalog()
    console.log(`[catalogSync] Sports done: ${sportsUpserted} upserted`)

    const { fetched, upserted, failedSets } = await syncPokemonSets()
    console.log(`[catalogSync] Pokemon done: ${fetched} fetched, ${upserted} upserted, ${failedSets.length} sets failed`)

    await invalidateCatalogCache()
    console.log('[catalogSync] Cache invalidated')

    const result: SyncResult = {
      status: failedSets.length > 0 ? 'partial' : 'ok',
      cleaned,
      sportsUpserted,
      pokemonFetched: fetched,
      pokemonUpserted: upserted,
      pokemonSetsProcessed: POKEMON_SYNC_SETS.length - failedSets.length,
      pokemonSetsFailed: failedSets,
      durationMs: Date.now() - start,
    }

    console.log('[catalogSync] Complete:', result)
    return result
  } catch (err) {
    return {
      status: 'error',
      cleaned: 0,
      sportsUpserted: 0,
      pokemonFetched: 0,
      pokemonUpserted: 0,
      pokemonSetsProcessed: 0,
      pokemonSetsFailed: [],
      durationMs: Date.now() - start,
      error: String(err),
    }
  }
}
