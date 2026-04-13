/**
 * Manual Release Provider
 *
 * Static curated seed data for products not covered by API providers,
 * including sports cards (Topps, Panini) and upcoming TCG products.
 *
 * Add entries here when you know of a product before a scraper covers it.
 * IDs must be globally unique within this provider.
 *
 * Last updated: 2026-04
 */
import type { NormalizedRelease, ReleaseProvider } from './types'
import { deriveStatus } from './types'

const SOURCE = 'manual'

function manual(
  id: string,
  overrides: Partial<NormalizedRelease> & Pick<NormalizedRelease, 'name' | 'category'>,
): NormalizedRelease {
  const now = new Date()
  return {
    sourceExternalId: id,
    sourceName:       SOURCE,
    sourceUrl:        null,
    manufacturer:     null,
    brand:            null,
    productLine:      null,
    sport:            null,
    game:             null,
    season:           null,
    year:             null,
    imageUrl:         null,
    externalUrl:      null,
    description:      null,
    announcementDate: null,
    preorderDate:     null,
    releaseDate:      null,
    ...overrides,
    status: overrides.status ?? deriveStatus(
      overrides.releaseDate ?? null,
      overrides.preorderDate ?? null,
      overrides.announcementDate ?? null,
    ),
    firstSeenAt: now,
  } as NormalizedRelease
}

const d = (s: string) => new Date(s)

type BowmanLiveInfo = {
  hobbyReleaseDate: Date | null
  jumboReleaseDate: Date | null
  megaReleaseDate: Date | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseMonthDayYear(raw: string): Date | null {
  const m = raw.match(/([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/)
  if (!m) return null
  const parsed = new Date(m[1])
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseToppsReleaseDateFromHtml(html: string): Date | null {
  // Pattern 1: "product release date, April 23, 2026"
  const bySentence = html.match(/product release date,\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i)
  if (bySentence) {
    const parsed = parseMonthDayYear(bySentence[0])
    if (parsed) return parsed
  }

  // Pattern 2: "Available From | Apr 23, 2026"
  const byAvailableFrom = html.match(/Available From[^A-Za-z0-9]{0,20}([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i)
  if (byAvailableFrom) {
    const parsed = parseMonthDayYear(byAvailableFrom[0])
    if (parsed) return parsed
  }

  return null
}

async function fetchToppsReleaseDate(url: string): Promise<Date | null> {
  const maxAttempts = 2
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) {
        if (attempt < maxAttempts) await sleep(250 * attempt)
        continue
      }

      const html = await res.text()
      const parsed = parseToppsReleaseDateFromHtml(html)
      if (parsed) return parsed

      if (attempt < maxAttempts) await sleep(250 * attempt)
    } catch {
      if (attempt < maxAttempts) await sleep(250 * attempt)
    } finally {
      clearTimeout(timeout)
    }
  }

  return null
}

async function fetchBowmanBasketballLiveInfo(): Promise<BowmanLiveInfo> {
  const [hobbyReleaseDate, jumboReleaseDate, megaReleaseDate] = await Promise.all([
    fetchToppsReleaseDate('https://www.topps.com/products/2025-26-bowman-basketball-hobby-box'),
    fetchToppsReleaseDate('https://www.topps.com/products/2025-26-bowman-basketball-hobby-jumbo-box'),
    fetchToppsReleaseDate('https://www.topps.com/products/2025-26-bowman-basketball-mega-box'),
  ])

  return { hobbyReleaseDate, jumboReleaseDate, megaReleaseDate }
}

function applyLiveOverrides(
  releases: NormalizedRelease[],
  live: BowmanLiveInfo,
): NormalizedRelease[] {
  return releases.map((r) => {
    // Keep ids stable; only adjust the date + status using live scraped data.
    if (r.sourceExternalId === 'topps-bowman-bball-2526') {
      const nextRelease = live.hobbyReleaseDate ?? live.jumboReleaseDate ?? r.releaseDate
      return {
        ...r,
        releaseDate: nextRelease,
        status: deriveStatus(nextRelease, r.preorderDate, r.announcementDate),
        description:
          'Collectors can expect autos by configuration: Hobby (1 NBA + 1 NCAA), Jumbo (2 NBA + 2 NCAA), Breaker/Delight (2 NBA + 1 NCAA).',
      }
    }

    if (r.sourceExternalId === 'topps-bowman-bball-2526-mega') {
      const nextRelease = live.megaReleaseDate ?? r.releaseDate
      return {
        ...r,
        releaseDate: nextRelease,
        status: deriveStatus(nextRelease, r.preorderDate, r.announcementDate),
      }
    }

    return r
  })
}

export const MANUAL_RELEASES: NormalizedRelease[] = [

  // ── Pokemon TCG — 2025 ────────────────────────────────────────────────────

  manual('ptcg-sv9-en', {
    name: 'Journey Together (Scarlet & Violet)',
    category: 'TCG', game: 'pokemon',
    manufacturer: 'The Pokemon Company', brand: 'Scarlet & Violet', productLine: 'Scarlet & Violet',
    season: 'Scarlet & Violet', year: 2025,
    releaseDate: d('2025-03-28'),
    externalUrl: 'https://www.pokemon.com/us/pokemon-tcg/product-line/journey-together/',
    description: 'Features Lugia, Eternatus, and new Tera Pokémon ex.',
  }),

  manual('ptcg-sv8pt5-en', {
    name: 'Prismatic Evolutions (Scarlet & Violet)',
    category: 'TCG', game: 'pokemon',
    manufacturer: 'The Pokemon Company', brand: 'Scarlet & Violet', productLine: 'Scarlet & Violet',
    season: 'Scarlet & Violet', year: 2025,
    releaseDate: d('2025-01-17'),
    externalUrl: 'https://www.pokemon.com/us/pokemon-tcg/product-line/prismatic-evolutions/',
    description: 'Eevee and all its Eeveelutions featured. Extremely high demand.',
  }),

  manual('ptcg-sv9pt5-en', {
    name: 'Destined Rivals (Scarlet & Violet)',
    category: 'TCG', game: 'pokemon',
    manufacturer: 'The Pokemon Company', brand: 'Scarlet & Violet', productLine: 'Scarlet & Violet',
    season: 'Scarlet & Violet', year: 2025,
    releaseDate: d('2025-06-13'),
    externalUrl: 'https://www.pokemon.com/us/pokemon-tcg/',
    description: 'Next main Scarlet & Violet expansion. Details TBD.',
  }),

  // ── Basketball — 2024-25 ──────────────────────────────────────────────────

  manual('panini-prizm-bball-2425', {
    name: '2024-25 Panini Prizm Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Prizm Basketball',
    season: '2024-25', year: 2025,
    releaseDate: d('2025-02-05'),
    externalUrl: 'https://www.paniniamerica.net/',
    description: 'The flagship Basketball card release. Rookie class includes Wemby second-year cards.',
  }),

  manual('panini-select-bball-2425', {
    name: '2024-25 Panini Select Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Panini', brand: 'Select', productLine: 'Select Basketball',
    season: '2024-25', year: 2025,
    releaseDate: d('2025-03-19'),
    externalUrl: 'https://www.paniniamerica.net/',
  }),

  manual('panini-chronicles-bball-2425', {
    name: '2024-25 Panini Chronicles Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Panini', brand: 'Chronicles', productLine: 'Chronicles Basketball',
    season: '2024-25', year: 2025,
    releaseDate: d('2025-04-30'),
    externalUrl: 'https://www.paniniamerica.net/',
  }),

  manual('panini-immaculate-bball-2425', {
    name: '2024-25 Panini Immaculate Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Panini', brand: 'Immaculate', productLine: 'Immaculate Basketball',
    season: '2024-25', year: 2025,
    releaseDate: d('2025-05-21'),
    externalUrl: 'https://www.paniniamerica.net/',
    description: 'Premium patch-auto product. Cooper Flagg rookies expected.',
  }),

  manual('panini-national-treasures-bball-2425', {
    name: '2024-25 Panini National Treasures Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Panini', brand: 'National Treasures', productLine: 'National Treasures Basketball',
    season: '2024-25', year: 2025,
    releaseDate: d('2025-07-09'),
    externalUrl: 'https://www.paniniamerica.net/',
    description: 'Ultra-premium product with on-card autos and massive patches.',
  }),

  // 2025-26 Draft Class
  manual('topps-chrome-bball-2526', {
    name: '2025-26 Topps Chrome Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Topps', brand: 'Chrome', productLine: 'Chrome Basketball',
    season: '2025-26', year: 2025,
    announcementDate: d('2025-04-01'),
    releaseDate: d('2025-10-15'),  // estimated
    externalUrl: 'https://www.topps.com/',
    description: 'Will feature Ace Bailey, Kon Knueppel, Dylan Harper RCs.',
  }),

  manual('topps-bowman-bball-2526', {
    name: '2025-26 Topps Bowman Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Topps', brand: 'Bowman', productLine: 'Bowman Basketball',
    season: '2025-26', year: 2026,
    announcementDate: d('2026-03-20'),
    releaseDate: d('2026-04-23'),
    externalUrl: 'https://www.topps.com/',
    description: 'Bowman-branded basketball rookie/prospect-focused release.',
  }),

  manual('topps-bowman-bball-2526-mega', {
    name: '2025-26 Topps Bowman Basketball Mega Box',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Topps', brand: 'Bowman', productLine: 'Bowman Basketball Mega',
    season: '2025-26', year: 2026,
    announcementDate: d('2026-03-20'),
    releaseDate: d('2026-05-07'),
    externalUrl: 'https://www.topps.com/products/2025-26-bowman-basketball-mega-box',
    description: 'Mega format release for Bowman Basketball.',
  }),

  manual('panini-prizm-bball-2526', {
    name: '2025-26 Panini Prizm Basketball',
    category: 'SPORTS', sport: 'Basketball', game: 'basketball',
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Prizm Basketball',
    season: '2025-26', year: 2025,
    announcementDate: d('2025-04-01'),
    releaseDate: d('2026-01-14'),  // estimated
    externalUrl: 'https://www.paniniamerica.net/',
    description: 'Will feature 2025 NBA Draft class rookies.',
  }),

  // ── Baseball — 2025 ───────────────────────────────────────────────────────

  manual('topps-series1-baseball-2025', {
    name: '2025 Topps Series 1 Baseball',
    category: 'SPORTS', sport: 'Baseball', game: 'baseball',
    manufacturer: 'Topps', brand: 'Topps', productLine: 'Topps Series 1',
    season: '2025', year: 2025,
    releaseDate: d('2025-02-05'),
    externalUrl: 'https://www.topps.com/',
    description: 'Flagship baseball release for the 2025 season.',
  }),

  manual('pokemon-collector-chest-fall-2024', {
    name: 'Pokemon TCG Collector Chest (Fall 2024)',
    category: 'TCG', game: 'pokemon',
    manufacturer: 'The Pokemon Company', brand: 'Pokemon TCG', productLine: 'Collector Chest',
    season: '2024', year: 2024,
    releaseDate: d('2024-10-18'),
    externalUrl: 'https://www.pokemon.com/us/pokemon-tcg/',
    description: 'Seasonal collector kit/chest bundle release.',
  }),

  manual('pokemon-collector-chest-fall-2025', {
    name: 'Pokemon TCG Collector Chest (Fall 2025)',
    category: 'TCG', game: 'pokemon',
    manufacturer: 'The Pokemon Company', brand: 'Pokemon TCG', productLine: 'Collector Chest',
    season: '2025', year: 2025,
    releaseDate: d('2025-12-05'),
    externalUrl: 'https://www.pokemon.com/us/pokemon-tcg/',
    description: 'Collector kit/chest bundle (Fall 2025 seasonal release).',
  }),

  manual('pokemon-collector-chest-fall-2026', {
    name: 'Pokemon TCG Collector Chest (Fall 2026)',
    category: 'TCG', game: 'pokemon',
    manufacturer: 'The Pokemon Company', brand: 'Pokemon TCG', productLine: 'Collector Chest',
    season: '2026', year: 2026,
    announcementDate: d('2026-09-01'),
    releaseDate: d('2026-11-27'), // estimated
    externalUrl: 'https://www.pokemon.com/us/pokemon-tcg/',
    description: 'Upcoming collector kit/chest seasonal release.',
  }),

  manual('topps-chrome-baseball-2025', {
    name: '2025 Topps Chrome Baseball',
    category: 'SPORTS', sport: 'Baseball', game: 'baseball',
    manufacturer: 'Topps', brand: 'Chrome', productLine: 'Chrome Baseball',
    season: '2025', year: 2025,
    releaseDate: d('2025-08-06'),
    externalUrl: 'https://www.topps.com/',
  }),

  manual('bowman-baseball-2025', {
    name: '2025 Bowman Baseball',
    category: 'SPORTS', sport: 'Baseball', game: 'baseball',
    manufacturer: 'Topps', brand: 'Bowman', productLine: 'Bowman Baseball',
    season: '2025', year: 2025,
    releaseDate: d('2025-05-07'),
    externalUrl: 'https://www.topps.com/',
    description: 'Top prospect cards – key annual release for prospect collectors.',
  }),

  manual('bowman-baseball-2026', {
    name: '2026 Bowman Baseball',
    category: 'SPORTS', sport: 'Baseball', game: 'baseball',
    manufacturer: 'Topps', brand: 'Bowman', productLine: 'Bowman Baseball',
    season: '2026', year: 2026,
    announcementDate: d('2026-03-15'),
    releaseDate: d('2026-05-06'), // estimated
    externalUrl: 'https://www.topps.com/',
    description: 'Upcoming Bowman prospect release for the 2026 season.',
  }),

  // ── Football — 2025 ───────────────────────────────────────────────────────

  manual('panini-prizm-nfl-draft-2025', {
    name: '2025 Panini Prizm NFL Draft Picks',
    category: 'SPORTS', sport: 'Football', game: 'football',
    manufacturer: 'Panini', brand: 'Prizm', productLine: 'Prizm NFL Draft Picks',
    season: '2025', year: 2025,
    releaseDate: d('2025-06-18'),
    externalUrl: 'https://www.paniniamerica.net/',
    description: 'Pre-NFL debut rookie cards for the 2025 draft class.',
  }),

  manual('topps-chrome-ufc-2025', {
    name: '2025 Topps Chrome UFC',
    category: 'SPORTS', sport: 'MMA', game: 'mma',
    manufacturer: 'Topps', brand: 'Chrome', productLine: 'Chrome UFC',
    season: '2025', year: 2025,
    releaseDate: d('2025-07-16'),
    externalUrl: 'https://www.topps.com/',
  }),
]

export const manualReleaseProvider: ReleaseProvider = {
  name: SOURCE,
  async fetch(): Promise<NormalizedRelease[]> {
    const live = await fetchBowmanBasketballLiveInfo()
    return applyLiveOverrides(MANUAL_RELEASES, live)
  },
}
