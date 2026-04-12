import { prisma } from '@/lib/prisma'
import { buildFuseIndex, searchCatalog } from '@/lib/fuzzy'
import type { FuseCardResult } from '@/lib/fuzzy'
import type { CardCatalog } from '@prisma/client'

let catalogCache: CardCatalog[] | null = null
let cacheBuiltAt: Date | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── Fallback seed data (inserted automatically when catalog is empty) ──────────
// Keeps the search working on fresh deployments before `npm run db:seed` is run.

const FALLBACK_SEED: Omit<CardCatalog, 'createdAt' | 'updatedAt'>[] = [
  // ── Pokemon ────────────────────────────────────────────────────────────────
  {
    id: 'seed-base1-4', category: 'TCG', game: 'pokemon',
    cardName: 'Charizard', setName: 'Base Set', cardNumber: '4',
    rarity: 'Holo Rare', variant: 'Shadowless', language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/base1/4_hires.png',
    normalizedSearchText: 'charizard base set 4 holo rare shadowless',
    externalSource: 'pokemontcg', externalId: 'base1-4',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-sv3-228', category: 'TCG', game: 'pokemon',
    cardName: 'Charizard ex', setName: 'Obsidian Flames', cardNumber: '228',
    rarity: 'Special Illustration Rare', variant: null, language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/sv3/228_hires.png',
    normalizedSearchText: 'charizard ex obsidian flames 228 special illustration rare',
    externalSource: 'pokemontcg', externalId: 'sv3-228',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-sv3pt5-199', category: 'TCG', game: 'pokemon',
    cardName: 'Charizard ex', setName: 'Scarlet & Violet 151', cardNumber: '199',
    rarity: 'Special Illustration Rare', variant: null, language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/199_hires.png',
    normalizedSearchText: 'charizard ex scarlet violet 151 199 special illustration rare',
    externalSource: 'pokemontcg', externalId: 'sv3pt5-199',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-swsh7-215', category: 'TCG', game: 'pokemon',
    cardName: 'Umbreon VMAX', setName: 'Evolving Skies', cardNumber: '215',
    rarity: 'Secret Rare', variant: 'Alternate Art', language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png',
    normalizedSearchText: 'umbreon vmax evolving skies 215 secret rare alternate art moonbreon',
    externalSource: 'pokemontcg', externalId: 'swsh7-215',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-sv3pt5-205', category: 'TCG', game: 'pokemon',
    cardName: 'Mew ex', setName: 'Scarlet & Violet 151', cardNumber: '205',
    rarity: 'Special Illustration Rare', variant: null, language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/205_hires.png',
    normalizedSearchText: 'mew ex scarlet violet 151 205 special illustration rare',
    externalSource: 'pokemontcg', externalId: 'sv3pt5-205',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-sv3pt5-151', category: 'TCG', game: 'pokemon',
    cardName: 'Mew', setName: 'Scarlet & Violet 151', cardNumber: '151',
    rarity: 'Illustration Rare', variant: null, language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/151_hires.png',
    normalizedSearchText: 'mew scarlet violet 151 illustration rare',
    externalSource: 'pokemontcg', externalId: 'sv3pt5-151',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-cel25-1', category: 'TCG', game: 'pokemon',
    cardName: 'Pikachu', setName: 'Celebrations', cardNumber: '1',
    rarity: 'Promo', variant: null, language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/cel25/1_hires.png',
    normalizedSearchText: 'pikachu celebrations 1 promo',
    externalSource: 'pokemontcg', externalId: 'cel25-1',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-swsh7-217', category: 'TCG', game: 'pokemon',
    cardName: 'Rayquaza VMAX', setName: 'Evolving Skies', cardNumber: '217',
    rarity: 'Secret Rare', variant: 'Alternate Art', language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/swsh7/217_hires.png',
    normalizedSearchText: 'rayquaza vmax evolving skies 217 secret rare alternate art',
    externalSource: 'pokemontcg', externalId: 'swsh7-217',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  {
    id: 'seed-swsh12-186', category: 'TCG', game: 'pokemon',
    cardName: 'Lugia V', setName: 'Silver Tempest', cardNumber: '186',
    rarity: 'Special Illustration Rare', variant: null, language: 'EN',
    imageUrl: 'https://images.pokemontcg.io/swsh12/186_hires.png',
    normalizedSearchText: 'lugia v silver tempest 186 special illustration rare',
    externalSource: 'pokemontcg', externalId: 'swsh12-186',
    sport: null, league: null, season: null, manufacturer: null, brand: null,
    productLine: null, subsetName: null, insertName: null, parallel: null,
    serialNumbered: false, autograph: false, memorabilia: false, rookie: false,
    playerName: null, teamName: null, year: null,
  },
  // ── Basketball / Sports ────────────────────────────────────────────────────
  {
    id: 'seed-sports-wemby-prizm-base-rc', category: 'SPORTS', game: 'basketball',
    cardName: 'Victor Wembanyama', playerName: 'Victor Wembanyama', teamName: 'San Antonio Spurs',
    setName: '2023-24 Panini Prizm Basketball', cardNumber: '1',
    sport: 'Basketball', league: 'NBA', season: '2023-24', year: 2023,
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
    parallel: null, insertName: null,
    rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
    imageUrl: null, externalSource: 'manual', externalId: null,
    normalizedSearchText: 'victor wembanyama wemby san antonio spurs prizm basketball 2023 24 panini nba rc rookie',
    rarity: null, variant: null, language: 'EN', subsetName: null,
  },
  {
    id: 'seed-sports-wemby-prizm-silver-rc', category: 'SPORTS', game: 'basketball',
    cardName: 'Victor Wembanyama', playerName: 'Victor Wembanyama', teamName: 'San Antonio Spurs',
    setName: '2023-24 Panini Prizm Basketball', cardNumber: '1',
    sport: 'Basketball', league: 'NBA', season: '2023-24', year: 2023,
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
    parallel: 'Silver Prizm', insertName: null,
    rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
    imageUrl: null, externalSource: 'manual', externalId: null,
    normalizedSearchText: 'victor wembanyama wemby silver prizm san antonio spurs basketball 2023 24 panini nba rc rookie',
    rarity: null, variant: null, language: 'EN', subsetName: null,
  },
  {
    id: 'seed-sports-clark-topps-chrome-rc', category: 'SPORTS', game: 'basketball',
    cardName: 'Caitlin Clark', playerName: 'Caitlin Clark', teamName: 'Indiana Fever',
    setName: '2024 Topps Chrome Basketball', cardNumber: '1',
    sport: 'Basketball', league: 'WNBA', season: '2024', year: 2024,
    manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
    parallel: null, insertName: null,
    rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
    imageUrl: null, externalSource: 'manual', externalId: null,
    normalizedSearchText: 'caitlin clark indiana fever topps chrome basketball 2024 wnba rc rookie',
    rarity: null, variant: null, language: 'EN', subsetName: null,
  },
  {
    id: 'seed-sports-lebron-prizm-2425', category: 'SPORTS', game: 'basketball',
    cardName: 'LeBron James', playerName: 'LeBron James', teamName: 'Los Angeles Lakers',
    setName: '2024-25 Panini Prizm Basketball', cardNumber: '1',
    sport: 'Basketball', league: 'NBA', season: '2024-25', year: 2024,
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
    parallel: null, insertName: null,
    rookie: false, autograph: false, memorabilia: false, serialNumbered: false,
    imageUrl: null, externalSource: 'manual', externalId: null,
    normalizedSearchText: 'lebron james los angeles lakers prizm basketball 2024 25 panini nba',
    rarity: null, variant: null, language: 'EN', subsetName: null,
  },
  {
    id: 'seed-sports-ant-prizm-silver-2425', category: 'SPORTS', game: 'basketball',
    cardName: 'Anthony Edwards', playerName: 'Anthony Edwards', teamName: 'Minnesota Timberwolves',
    setName: '2024-25 Panini Prizm Basketball', cardNumber: '83',
    sport: 'Basketball', league: 'NBA', season: '2024-25', year: 2024,
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
    parallel: 'Silver Prizm', insertName: null,
    rookie: false, autograph: false, memorabilia: false, serialNumbered: false,
    imageUrl: null, externalSource: 'manual', externalId: null,
    normalizedSearchText: 'anthony edwards ant timberwolves silver prizm basketball 2024 25 panini nba',
    rarity: null, variant: null, language: 'EN', subsetName: null,
  },
  {
    id: 'seed-sports-flagg-topps-chrome-rc', category: 'SPORTS', game: 'basketball',
    cardName: 'Cooper Flagg', playerName: 'Cooper Flagg', teamName: 'Dallas Mavericks',
    setName: '2025-26 Topps Chrome Basketball', cardNumber: '101',
    sport: 'Basketball', league: 'NBA', season: '2025-26', year: 2025,
    manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
    parallel: null, insertName: null,
    rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
    imageUrl: null, externalSource: 'manual', externalId: null,
    normalizedSearchText: 'cooper flagg dallas mavericks topps chrome basketball 2025 26 nba rc rookie',
    rarity: null, variant: null, language: 'EN', subsetName: null,
  },
  {
    id: 'seed-sports-bronny-prizm-rc', category: 'SPORTS', game: 'basketball',
    cardName: 'Bronny James', playerName: 'Bronny James', teamName: 'Los Angeles Lakers',
    setName: '2024-25 Panini Prizm Basketball', cardNumber: '254',
    sport: 'Basketball', league: 'NBA', season: '2024-25', year: 2024,
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
    parallel: null, insertName: null,
    rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
    imageUrl: null, externalSource: 'manual', externalId: null,
    normalizedSearchText: 'bronny james los angeles lakers prizm basketball 2024 25 panini nba rc rookie',
    rarity: null, variant: null, language: 'EN', subsetName: null,
  },
]

// ── Auto-seed empty catalog ───────────────────────────────────────────────────

async function ensureCatalogSeeded(): Promise<void> {
  const count = await prisma.cardCatalog.count()
  if (count > 0) return

  console.log('[cardSearchService] Catalog is empty — inserting fallback seed data')
  await prisma.cardCatalog.createMany({
    data: FALLBACK_SEED.map((card) => ({
      ...card,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    skipDuplicates: true,
  })
}

// ── Cache management ──────────────────────────────────────────────────────────

async function getCatalog(): Promise<CardCatalog[]> {
  if (catalogCache && cacheBuiltAt && Date.now() - cacheBuiltAt.getTime() < CACHE_TTL_MS) {
    return catalogCache
  }

  await ensureCatalogSeeded()

  catalogCache = await prisma.cardCatalog.findMany({ orderBy: { cardName: 'asc' } })
  cacheBuiltAt = new Date()
  buildFuseIndex(catalogCache)
  return catalogCache
}

// ── Token-split keyword fallback ──────────────────────────────────────────────
// Used when fuzzy returns nothing — splits query into tokens and does inclusive
// substring matching across all searchable fields.

function keywordFallback(query: string, catalog: CardCatalog[], limit: number): FuseCardResult[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)

  if (tokens.length === 0) return []

  const scored = catalog
    .map((card) => {
      const haystack = [
        card.normalizedSearchText,
        card.cardName,
        card.playerName,
        card.setName,
        card.brand,
        card.season,
        card.parallel,
        card.teamName,
        card.cardNumber,
        card.variant,
        card.rarity,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matched = tokens.filter((t) => haystack.includes(t)).length
      return { card, matched, total: tokens.length }
    })
    .filter(({ matched }) => matched > 0)
    // Prefer cards where ALL tokens match; degrade gracefully to partial matches
    .sort((a, b) => b.matched / b.total - a.matched / a.total)
    .slice(0, limit)

  return scored.map(({ card }, i) => ({
    item: card,
    score: 0.5,
    refIndex: i,
  }))
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchCards(query: string, limit = 12): Promise<CardCatalog[]> {
  if (!query || query.trim().length < 2) return []

  const catalog = await getCatalog()
  let results = searchCatalog(query.trim(), catalog, limit)

  // Fuzzy found nothing → try token-based keyword fallback
  if (results.length === 0 && catalog.length > 0) {
    results = keywordFallback(query.trim(), catalog, limit)
  }

  return results.map((r) => r.item)
}

/** Returns top N catalog items for display on focus (no query required). */
export async function getTopCards(limit = 8): Promise<CardCatalog[]> {
  const catalog = await getCatalog()
  if (catalog.length === 0) return []

  // Mix: half Pokemon, half sports — prioritise rookies for sports
  const pokemon = catalog
    .filter((c) => c.game === 'pokemon')
    .slice(0, Math.ceil(limit / 2))

  const sports = catalog
    .filter((c) => c.category === 'SPORTS')
    .sort((a, b) => (b.rookie ? 1 : 0) - (a.rookie ? 1 : 0))
    .slice(0, Math.floor(limit / 2))

  return [...pokemon, ...sports].slice(0, limit)
}

export async function getCatalogStats(): Promise<{ total: number; pokemon: number; sports: number }> {
  const catalog = await getCatalog()
  return {
    total: catalog.length,
    pokemon: catalog.filter((c) => c.game === 'pokemon').length,
    sports: catalog.filter((c) => c.category === 'SPORTS').length,
  }
}

export async function getCardById(id: string): Promise<CardCatalog | null> {
  return prisma.cardCatalog.findUnique({ where: { id } })
}

export async function addCardToCatalog(
  data: Omit<CardCatalog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CardCatalog> {
  const card = await prisma.cardCatalog.create({ data })
  catalogCache = null // invalidate cache
  return card
}

export async function invalidateCatalogCache(): Promise<void> {
  catalogCache = null
  cacheBuiltAt = null
}
