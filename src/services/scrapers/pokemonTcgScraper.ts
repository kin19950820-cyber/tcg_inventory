/**
 * Fetches card data from the free pokemontcg.io API.
 *
 * Free tier: 1 000 req/day (no key), 20 000 req/day with a free API key.
 * Set POKEMON_TCG_API_KEY in .env to unlock the higher limit.
 *
 * Each call to `fetchSetCards` costs 1 request (up to 250 cards).
 * Syncing 15 sets = 15 requests — well within both tiers.
 */

// Sets to sync, newest first.  Add new set IDs here when they release.
export const POKEMON_SYNC_SETS = [
  // ── Scarlet & Violet era ──────────────────────────────────────────────────
  'sv8',      // Surging Sparks  (2024-11)
  'sv7',      // Stellar Crown    (2024-09)
  'sv6pt5',   // Shrouded Fable   (2024-08)
  'sv6',      // Twilight Masquerade (2024-05)
  'sv5',      // Temporal Forces  (2024-03)
  'sv4pt5',   // Paldean Fates    (2024-01)
  'sv4',      // Paradox Rift     (2023-11)
  'sv3pt5',   // 151              (2023-09) ← fan favourite
  'sv3',      // Obsidian Flames  (2023-08) ← Charizard ex SIR
  'sv2',      // Paldea Evolved   (2023-06)
  'sv1',      // Scarlet & Violet  (2023-03)
  // ── Sword & Shield era (most-collected) ──────────────────────────────────
  'swsh7',    // Evolving Skies   (2021-08) ← Umbreon AA
  'swsh12',   // Silver Tempest   (2022-11) ← Lugia SIR
  'swsh9',    // Brilliant Stars  (2022-02) ← Arceus
  // ── Classic ──────────────────────────────────────────────────────────────
  'base1',    // Base Set         (1999) ← Original Charizard
]

export interface PokemonTCGCard {
  id: string
  name: string
  number: string
  rarity?: string
  set: { id: string; name: string }
  images: { small?: string; large?: string }
  subtypes?: string[]
  supertype?: string
}

interface APIResponse {
  data: PokemonTCGCard[]
  count: number
  totalCount: number
  page: number
  pageSize: number
}

/** Fetch all cards from a single set (handles pagination automatically). */
export async function fetchSetCards(setId: string): Promise<PokemonTCGCard[]> {
  const apiKey = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
  }

  const allCards: PokemonTCGCard[] = []
  let page = 1

  while (true) {
    const url =
      `https://api.pokemontcg.io/v2/cards` +
      `?q=set.id:${setId}` +
      `&pageSize=250` +
      `&page=${page}` +
      `&select=id,name,number,rarity,set,images,subtypes,supertype`

    let res: Response
    try {
      res = await fetch(url, { headers, next: { revalidate: 0 } })
    } catch (err) {
      console.warn(`[pokemonTCG] fetch failed for set ${setId} p${page}:`, err)
      break
    }

    if (!res.ok) {
      console.warn(`[pokemonTCG] HTTP ${res.status} for set ${setId} p${page}`)
      break
    }

    const json: APIResponse = await res.json()
    allCards.push(...json.data)

    if (allCards.length >= json.totalCount || json.data.length < 250) break
    page++
  }

  return allCards
}

/** Map a pokemontcg.io card to our CardCatalog insert shape. */
export function mapPokemonCard(card: PokemonTCGCard): {
  id: string
  category: string
  game: string
  cardName: string
  setName: string
  cardNumber: string
  language: string
  rarity: string | null
  variant: string | null
  imageUrl: string | null
  normalizedSearchText: string
  externalSource: string
  externalId: string
} {
  // Detect variants from subtypes / rarity strings
  const subtypes = card.subtypes ?? []
  let variant: string | null = null
  if (card.rarity?.toLowerCase().includes('special illustration')) {
    variant = 'Special Illustration Rare'
  } else if (card.rarity?.toLowerCase().includes('illustration rare')) {
    variant = 'Illustration Rare'
  } else if (subtypes.includes('Radiant')) {
    variant = 'Radiant'
  } else if (card.number?.includes('TG')) {
    variant = 'Trainer Gallery'
  }

  const normalizedSearchText = [
    card.name,
    card.set.name,
    card.number,
    card.rarity,
    variant,
    'pokemon', 'tcg',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    id: `ptcg-${card.id}`,
    category: 'TCG',
    game: 'pokemon',
    cardName: card.name,
    setName: card.set.name,
    cardNumber: card.number,
    language: 'EN',
    rarity: card.rarity ?? null,
    variant,
    imageUrl: card.images.large ?? card.images.small ?? null,
    normalizedSearchText,
    externalSource: 'pokemontcg',
    externalId: card.id,
  }
}
