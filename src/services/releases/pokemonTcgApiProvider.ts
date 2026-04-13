/**
 * Pokemon TCG API Release Provider
 *
 * Uses the free pokemontcg.io /v2/sets endpoint to get all Pokemon TCG set
 * release dates. Filters to recent and upcoming sets only.
 *
 * Requires: POKEMON_TCG_API_KEY (optional — 20k req/day with key, 1k without)
 *
 * Data returned per set:
 *   id, name, series, releaseDate, printedTotal, images.logo, images.symbol
 */
import type { NormalizedRelease, ReleaseProvider } from './types'
import { deriveStatus, parseDate } from './types'

const API_BASE = 'https://api.pokemontcg.io/v2'
const SOURCE   = 'pokemon-tcg-api'
const SOURCE_URL = 'https://api.pokemontcg.io/v2/sets'

// Only surface sets released in the past 18 months or with a future release date
const LOOKBACK_DAYS = 540  // ~18 months

type ApiSet = {
  id:          string
  name:        string
  series:      string
  releaseDate: string  // "2025/02/07"
  printedTotal: number
  images: { symbol?: string; logo?: string }
}

type ApiResponse = { data: ApiSet[] }

// Manufacturer/brand lookup from series
function inferManufacturerBrand(series: string, _name: string): { manufacturer: string; brand: string } {
  // All modern Pokemon sets are The Pokemon Company / Nintendo
  return { manufacturer: 'The Pokemon Company', brand: series }
}

export const pokemonTcgApiProvider: ReleaseProvider = {
  name: SOURCE,

  async fetch(): Promise<NormalizedRelease[]> {
    const apiKey = process.env.POKEMON_TCG_API_KEY
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
    }

    const res = await fetch(
      `${API_BASE}/sets?orderBy=-releaseDate&pageSize=250`,
      { headers, next: { revalidate: 0 } },
    )
    if (!res.ok) throw new Error(`Pokemon TCG API returned ${res.status}`)

    const json: ApiResponse = await res.json()
    const sets = json.data ?? []

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS)

    const results: NormalizedRelease[] = []

    for (const set of sets) {
      const releaseDate = parseDate(set.releaseDate)

      // Filter: skip sets older than our lookback window (unless they have no date = future)
      if (releaseDate && releaseDate < cutoff) continue

      const { manufacturer, brand } = inferManufacturerBrand(set.series, set.name)
      const status = deriveStatus(releaseDate, null, null)

      // Season: e.g. "Scarlet & Violet" series → "2023" onwards
      const yearFromDate = releaseDate ? releaseDate.getFullYear() : null

      results.push({
        sourceExternalId: set.id,
        sourceName:       SOURCE,
        sourceUrl:        SOURCE_URL,
        name:             `${set.name} (${set.series})`,
        category:         'TCG',
        manufacturer,
        brand,
        productLine:      set.series,
        sport:            null,
        game:             'pokemon',
        season:           set.series,
        year:             yearFromDate,
        imageUrl:         set.images.logo ?? set.images.symbol ?? null,
        externalUrl:      `https://www.pokemon.com/us/pokemon-tcg/product-line/${set.id}/`,
        description:      `${set.name} — ${set.printedTotal} cards`,
        announcementDate: null,
        preorderDate:     null,
        releaseDate,
        status,
      })
    }

    return results
  },
}
