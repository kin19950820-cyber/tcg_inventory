/**
 * Orchestrates the daily catalog sync:
 *  1. Clean up invalid / stale records (removes "DOMINIAR"-style junk)
 *  2. Upsert sports card catalog (curated static dataset)
 *  3. Fetch Pokemon cards from pokemontcg.io API and upsert
 *  4. Invalidate the in-memory search cache
 *
 * Exported functions:
 *   runCatalogSync()         — full sync (needs ~60 s, use Pro plan)
 *   runSportsSync()          — sports-only (~2 s, Hobby-safe)
 *   runPokemonSetSync(setId) — single set (~3 s, Hobby-safe)
 */

import { prisma } from '@/lib/prisma'
import { invalidateCatalogCache } from '@/services/cardSearchService'
import { SPORTS_CATALOG_ENTRIES } from '@/services/scrapers/sportsCardCatalog'
import { BOX_CATALOG_ENTRIES } from '@/services/scrapers/boxCatalog'
import {
  POKEMON_SYNC_SETS,
  fetchSetCards,
  mapPokemonCard,
} from '@/services/scrapers/pokemonTcgScraper'

export interface SyncResult {
  status: 'ok' | 'partial' | 'error'
  cleaned?: number
  sportsUpserted?: number
  boxesUpserted?: number
  pokemonFetched?: number
  pokemonUpserted?: number
  pokemonSetsProcessed?: number
  pokemonSetsFailed?: string[]
  set?: string
  durationMs: number
  error?: string
}

// ── Known-valid values ─────────────────────────────────────────────────────────

const VALID_GAMES = new Set([
  'pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana', 'other',
  'basketball', 'baseball', 'football', 'soccer', 'hockey',
  'tennis', 'f1', 'golf', 'mma', 'sports',
])
const VALID_CATEGORIES = new Set(['TCG', 'SPORTS', 'SEALED'])

// ── Helpers ────────────────────────────────────────────────────────────────────

async function cleanupInvalidRecords(): Promise<number> {
  const all = await prisma.cardCatalog.findMany({
    select: { id: true, game: true, category: true, cardName: true },
  })
  const badIds = all
    .filter((r) => !VALID_GAMES.has(r.game) || !VALID_CATEGORIES.has(r.category))
    .map((r) => r.id)

  if (badIds.length > 0) {
    const names = all.filter((r) => badIds.includes(r.id)).map((r) => r.cardName)
    console.log(`[catalogSync] Removing ${badIds.length} invalid record(s):`, names)
    await prisma.cardCatalog.deleteMany({ where: { id: { in: badIds } } })
  }
  return badIds.length
}

async function upsertSportsCatalog(): Promise<number> {
  let count = 0
  for (const entry of SPORTS_CATALOG_ENTRIES) {
    const id = entry.id as string
    await prisma.cardCatalog.upsert({
      where: { id },
      update: {
        normalizedSearchText: entry.normalizedSearchText as string,
        teamName: entry.teamName ?? null,
        setName:  entry.setName  ?? null,
        parallel: entry.parallel ?? null,
        rookie:   entry.rookie   ?? false,
        season:   entry.season   ?? null,
        year:     entry.year     ?? null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: entry as any,
    })
    count++
  }
  return count
}

async function upsertBoxCatalog(): Promise<number> {
  let count = 0
  for (const entry of BOX_CATALOG_ENTRIES) {
    await prisma.cardCatalog.upsert({
      where: { id: entry.id },
      update: {
        normalizedSearchText: entry.normalizedSearchText,
        imageUrl: entry.imageUrl,
        variant:  entry.variant,
        setName:  entry.setName,
      },
      create: {
        id:                   entry.id,
        category:             'SEALED',
        game:                 entry.game,
        cardName:             entry.cardName,
        setName:              entry.setName,
        cardNumber:           null,
        language:             'EN',
        rarity:               null,
        variant:              entry.variant,
        imageUrl:             entry.imageUrl,
        normalizedSearchText: entry.normalizedSearchText,
        externalSource:       'manual',
        externalId:           null,
        sport:          null, league: null, season: null, manufacturer: null,
        brand:          null, productLine: null, subsetName: null, insertName: null,
        parallel:       null, playerName: null, teamName: null, year: null,
        serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
      },
    })
    count++
  }
  return count
}

async function upsertPokemonSet(setId: string): Promise<{ fetched: number; upserted: number }> {
  const cards = await fetchSetCards(setId)
  if (cards.length === 0) return { fetched: 0, upserted: 0 }

  const CHUNK = 25
  let upserted = 0

  for (let i = 0; i < cards.length; i += CHUNK) {
    const chunk = cards.slice(i, i + CHUNK)
    await Promise.all(
      chunk.map((card) => {
        const m = mapPokemonCard(card)
        return prisma.cardCatalog.upsert({
          where: { id: m.id },
          update: {
            imageUrl:             m.imageUrl,
            rarity:               m.rarity,
            variant:              m.variant,
            normalizedSearchText: m.normalizedSearchText,
          },
          create: {
            id:                   m.id,
            category:             'TCG',
            game:                 'pokemon',
            cardName:             m.cardName,
            setName:              m.setName,
            cardNumber:           m.cardNumber,
            language:             'EN',
            rarity:               m.rarity,
            variant:              m.variant,
            imageUrl:             m.imageUrl,
            normalizedSearchText: m.normalizedSearchText,
            externalSource:       'pokemontcg',
            externalId:           m.externalId,
            // nullable fields — explicitly null (no serialNumber on CardCatalog)
            sport:          null,
            league:         null,
            season:         null,
            manufacturer:   null,
            brand:          null,
            productLine:    null,
            subsetName:     null,
            insertName:     null,
            parallel:       null,
            playerName:     null,
            teamName:       null,
            year:           null,
            // boolean fields
            serialNumbered: false,
            autograph:      false,
            memorabilia:    false,
            rookie:         false,
          },
        })
      }),
    )
    upserted += chunk.length
  }

  return { fetched: cards.length, upserted }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Sports + boxes sync (~2 s). Safe on Vercel Hobby. */
export async function runSportsSync(): Promise<SyncResult> {
  const start = Date.now()
  try {
    const cleaned = await cleanupInvalidRecords()
    const sportsUpserted = await upsertSportsCatalog()
    const boxesUpserted = await upsertBoxCatalog()
    await invalidateCatalogCache()
    return { status: 'ok', cleaned, sportsUpserted, boxesUpserted, durationMs: Date.now() - start }
  } catch (err) {
    return { status: 'error', error: String(err), durationMs: Date.now() - start }
  }
}

/** Single Pokemon set sync (~3 s). Safe on Vercel Hobby. */
export async function runPokemonSetSync(setId: string): Promise<SyncResult> {
  const start = Date.now()
  try {
    const { fetched, upserted } = await upsertPokemonSet(setId)
    await invalidateCatalogCache()
    return {
      status: 'ok', set: setId,
      pokemonFetched: fetched, pokemonUpserted: upserted,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return { status: 'error', set: setId, error: String(err), durationMs: Date.now() - start }
  }
}

/** Full sync — cleanup + sports + all Pokemon sets. Needs ~60 s (Pro plan). */
export async function runCatalogSync(): Promise<SyncResult> {
  const start = Date.now()

  try {
    console.log('[catalogSync] Starting full sync...')

    const cleaned = await cleanupInvalidRecords()
    console.log(`[catalogSync] Cleanup: ${cleaned} removed`)

    const sportsUpserted = await upsertSportsCatalog()
    console.log(`[catalogSync] Sports: ${sportsUpserted} upserted`)

    const boxesUpserted = await upsertBoxCatalog()
    console.log(`[catalogSync] Boxes: ${boxesUpserted} upserted`)

    let totalFetched = 0, totalUpserted = 0
    const failedSets: string[] = []

    for (const setId of POKEMON_SYNC_SETS) {
      try {
        const { fetched, upserted } = await upsertPokemonSet(setId)
        totalFetched  += fetched
        totalUpserted += upserted
        console.log(`[catalogSync] ${setId}: ${fetched} fetched, ${upserted} upserted`)
        await new Promise((r) => setTimeout(r, 150))
      } catch (err) {
        console.error(`[catalogSync] Failed set ${setId}:`, err)
        failedSets.push(setId)
      }
    }

    await invalidateCatalogCache()

    return {
      status: failedSets.length > 0 ? 'partial' : 'ok',
      cleaned,
      sportsUpserted,
      boxesUpserted,
      pokemonFetched: totalFetched,
      pokemonUpserted: totalUpserted,
      pokemonSetsProcessed: POKEMON_SYNC_SETS.length - failedSets.length,
      pokemonSetsFailed: failedSets,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return { status: 'error', error: String(err), durationMs: Date.now() - start }
  }
}
