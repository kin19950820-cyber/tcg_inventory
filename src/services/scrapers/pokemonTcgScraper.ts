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

/**
 * Common shorthands collectors use when searching.
 * Key = pokemontcg.io set ID, value = extra alias tokens added to normalizedSearchText.
 * This lets queries like "sv151", "obf", "evs", "swsh7" find cards in those sets.
 */
const SET_ALIASES: Record<string, string> = {
  'sv8':     'sv8 surging sparks',
  'sv7':     'sv7 stellar crown',
  'sv6pt5':  'sv6pt5 shrouded fable',
  'sv6':     'sv6 twilight masquerade',
  'sv5':     'sv5 temporal forces',
  'sv4pt5':  'sv4pt5 paldean fates',
  'sv4':     'sv4 paradox rift',
  'sv3pt5':  'sv3pt5 sv151 151 scarlet violet 151',
  'sv3':     'sv3 obf obsidian flames',
  'sv2':     'sv2 paldea evolved',
  'sv1':     'sv1 scarlet violet base',
  'swsh7':   'swsh7 evs evolving skies',
  'swsh12':  'swsh12 sst silver tempest',
  'swsh9':   'swsh9 brs brilliant stars',
  'swsh6':   'swsh6 chilling reign',
  'swsh5':   'swsh5 battle styles',
  'base1':   'base1 base set original',
  'base2':   'base2 jungle',
  'base3':   'base3 fossil',
  'cel25':   'cel25 celebrations 25th anniversary',
}

/**
 * JP set info: maps an EN set ID to its JP equivalent name and set code.
 * JP cards have different card numbers and set names.
 * Source: Bulbapedia / official JP Pokemon TCG site.
 */
export const JP_SET_MAP: Record<string, { name: string; code: string }> = {
  'sv8':     { name: '超電ブレイカー',                code: 'SV8' },
  'sv7':     { name: '楽園ドラゴーナ',                code: 'SV7' },
  'sv6pt5':  { name: 'ナイトワンダラー',               code: 'SV6a' },
  'sv6':     { name: '変幻の仮面',                   code: 'SV6' },
  'sv5':     { name: 'ステラミラクル',                code: 'SV5' },
  'sv4pt5':  { name: 'シャイニートレジャーex',          code: 'SV4a' },
  'sv4':     { name: '古代の咆哮 / 未来の一閃',         code: 'SV4' },
  'sv3pt5':  { name: 'ポケモンカード151',              code: 'SV2a' },   // EN 151 = JP sv2a
  'sv3':     { name: '黒炎の支配者',                  code: 'SV3' },
  'sv2':     { name: 'スノーハザード / クレイバースト',  code: 'SV2' },
  'sv1':     { name: 'スカーレットex / バイオレットex', code: 'SV1' },
  'swsh12':  { name: 'VSTARユニバース',               code: 'S12a' },
  'swsh9':   { name: 'スターバース',                  code: 'S9' },
  'swsh7':   { name: '蒼空ストリーム / 白銀のランス',   code: 'S7' },
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
    SET_ALIASES[card.set.id] ?? '',
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

/**
 * Create a Japanese catalog entry for the same card.
 *
 * JP cards share the same artwork / name but have:
 *  - Different card numbers (e.g. EN #199 ≠ JP #006 for Charizard ex OBF)
 *  - Japanese set name
 *  - language: 'JA'
 *
 * Card number is stored as 'JP-???' as a placeholder — the actual JP number
 * must be entered manually when adding the card to inventory, since the EN API
 * doesn't expose JP numbers. The search text includes hints so users can find
 * the JP entry ("japanese jp ja").
 *
 * Exception: Pokemon 151 (sv3pt5/sv2a) — EN and JP numbering is identical
 * (001–165 follow the Pokédex), so we set the number directly.
 */
export function mapPokemonCardJP(card: PokemonTCGCard): ReturnType<typeof mapPokemonCard> | null {
  const jpSet = JP_SET_MAP[card.set.id]
  if (!jpSet) return null   // No JP equivalent mapped for this set

  const subtypes = card.subtypes ?? []
  let variant: string | null = null
  if (card.rarity?.toLowerCase().includes('special illustration')) variant = 'SAR'
  else if (card.rarity?.toLowerCase().includes('illustration rare')) variant = 'IR'
  else if (subtypes.includes('Radiant')) variant = 'Radiant'
  else if (card.number?.includes('TG')) return null  // Trainer Gallery is EN-only

  // Pokemon 151: EN sv3pt5 = JP sv2a — Pokédex numbering is identical (001-165)
  // All other sets: JP number unknown without a JP database; use placeholder
  const jpNumber = card.set.id === 'sv3pt5'
    ? card.number
    : `JP-${card.number}`   // placeholder — user must update when adding to inventory

  const jpSetName = jpSet.name

  const normalizedSearchText = [
    card.name,
    jpSetName,
    jpSet.code,
    jpNumber,
    card.rarity,
    variant,
    SET_ALIASES[card.set.id] ?? '',
    'pokemon', 'tcg', 'japanese', 'japan', 'jp', 'ja',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    id: `ptcg-jp-${card.id}`,
    category: 'TCG',
    game: 'pokemon',
    cardName: card.name,
    setName: jpSetName,
    cardNumber: jpNumber,
    language: 'JA',
    rarity: card.rarity ?? null,
    variant,
    imageUrl: card.images.large ?? card.images.small ?? null,
    normalizedSearchText,
    externalSource: 'pokemontcg-jp',
    externalId: `${card.id}-jp`,
  }
}
