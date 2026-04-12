/**
 * Curated sports card catalog.
 *
 * No single free public API exists for sports cards comparable to pokemontcg.io,
 * so we maintain a comprehensive static dataset here and upsert it on every sync.
 *
 * To expand: add entries to SPORTS_CATALOG_ENTRIES following the pattern below.
 * Each entry is deduped by its `id` field (stable slug).
 */

import type { Prisma } from '@prisma/client'

type CatalogInput = Omit<
  Prisma.CardCatalogCreateInput,
  'createdAt' | 'updatedAt'
>

function nst(...parts: (string | number | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function bball(
  slug: string,
  player: string,
  team: string,
  league: 'NBA' | 'WNBA' | 'G League',
  season: string,
  year: number,
  manufacturer: string,
  brand: string,
  cardNumber: string,
  parallel: string | null,
  rookie: boolean,
  aliases: string[] = [],
): CatalogInput {
  const setName = `${season} ${manufacturer} ${brand} Basketball`
  return {
    id: `sports-${slug}`,
    category: 'SPORTS',
    game: 'basketball',
    cardName: player,
    playerName: player,
    teamName: team,
    setName,
    cardNumber,
    sport: 'Basketball',
    league,
    season,
    year,
    manufacturer,
    brand,
    productLine: 'Basketball',
    parallel,
    insertName: null,
    rookie,
    autograph: false,
    memorabilia: false,
    serialNumbered: false,
    language: 'EN',
    rarity: null,
    variant: null,
    subsetName: null,
    serialNumber: null,
    imageUrl: null,
    externalSource: 'sports-catalog',
    externalId: slug,
    normalizedSearchText: nst(
      player, ...aliases, team, brand, season, parallel,
      manufacturer, league, setName, cardNumber,
      rookie ? 'rc rookie' : null, 'basketball',
    ),
  }
}

export const SPORTS_CATALOG_ENTRIES: CatalogInput[] = [
  // ── Victor Wembanyama ────────────────────────────────────────────────────
  bball('wemby-prizm-base-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm', '1', null, true, ['wemby', 'wembanyama']),
  bball('wemby-prizm-silver-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm', '1', 'Silver Prizm', true, ['wemby', 'wembanyama']),
  bball('wemby-prizm-gold-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm', '1', 'Gold Prizm /10', true, ['wemby', 'wembanyama']),
  bball('wemby-prizm-black-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm', '1', 'Black Prizm /1', true, ['wemby', 'wembanyama']),
  bball('wemby-select-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Select', '1', null, true, ['wemby', 'wembanyama']),
  bball('wemby-optic-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Donruss Optic', '1', null, true, ['wemby', 'wembanyama']),
  bball('wemby-nba-hoops-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'NBA Hoops', '1', null, true, ['wemby', 'wembanyama']),
  bball('wemby-mosaic-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Mosaic', '1', null, true, ['wemby', 'wembanyama']),
  bball('wemby-chronicles-rc-2324', 'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Chronicles', '1', null, true, ['wemby', 'wembanyama']),

  // ── Cooper Flagg ─────────────────────────────────────────────────────────
  bball('flagg-topps-chrome-base-rc-2526', 'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Topps', 'Chrome', '101', null, true, ['flagg', 'cooper']),
  bball('flagg-topps-chrome-silver-rc-2526', 'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Topps', 'Chrome', '101', 'Silver Refractor', true, ['flagg', 'cooper']),
  bball('flagg-topps-chrome-gold-rc-2526', 'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Topps', 'Chrome', '101', 'Gold Refractor /50', true, ['flagg', 'cooper']),
  bball('flagg-prizm-base-rc-2526', 'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Panini', 'Prizm', '101', null, true, ['flagg', 'cooper']),
  bball('flagg-prizm-silver-rc-2526', 'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Panini', 'Prizm', '101', 'Silver Prizm', true, ['flagg', 'cooper']),

  // ── Caitlin Clark ────────────────────────────────────────────────────────
  bball('clark-topps-chrome-base-rc-2024', 'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Topps', 'Chrome', '1', null, true, ['clark', 'caitlin']),
  bball('clark-topps-chrome-silver-rc-2024', 'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Topps', 'Chrome', '1', 'Silver Refractor', true, ['clark', 'caitlin']),
  bball('clark-topps-chrome-gold-rc-2024', 'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Topps', 'Chrome', '1', 'Gold Refractor /50', true, ['clark', 'caitlin']),
  bball('clark-prizm-wnba-base-rc-2024', 'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA', '1', null, true, ['clark', 'caitlin']),
  bball('clark-prizm-wnba-silver-rc-2024', 'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA', '1', 'Silver Prizm', true, ['clark', 'caitlin']),

  // ── LeBron James ─────────────────────────────────────────────────────────
  bball('lebron-prizm-base-2425', 'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '1', null, false, ['lebron', 'james', 'lbj']),
  bball('lebron-prizm-silver-2425', 'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '1', 'Silver Prizm', false, ['lebron', 'james', 'lbj']),
  bball('lebron-select-base-2425', 'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Select', '1', null, false, ['lebron', 'james', 'lbj']),
  bball('lebron-topps-chrome-2425', 'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Topps', 'Chrome', '1', null, false, ['lebron', 'james', 'lbj']),

  // ── Anthony Edwards ──────────────────────────────────────────────────────
  bball('ant-prizm-base-2425', 'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '83', null, false, ['ant', 'edwards', 'ant man']),
  bball('ant-prizm-silver-2425', 'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '83', 'Silver Prizm', false, ['ant', 'edwards', 'ant man']),
  bball('ant-select-base-2425', 'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Select', '83', null, false, ['ant', 'edwards']),
  bball('ant-optic-base-2425', 'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Donruss Optic', '83', null, false, ['ant', 'edwards']),

  // ── Bronny James ─────────────────────────────────────────────────────────
  bball('bronny-prizm-base-rc-2425', 'Bronny James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '254', null, true, ['bronny']),
  bball('bronny-prizm-silver-rc-2425', 'Bronny James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '254', 'Silver Prizm', true, ['bronny']),
  bball('bronny-select-rc-2425', 'Bronny James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Select', '254', null, true, ['bronny']),

  // ── Stephen Curry ────────────────────────────────────────────────────────
  bball('curry-prizm-base-2425', 'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '137', null, false, ['steph', 'curry', 'stephen']),
  bball('curry-prizm-silver-2425', 'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '137', 'Silver Prizm', false, ['steph', 'curry', 'stephen']),
  bball('curry-select-base-2425', 'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Panini', 'Select', '137', null, false, ['steph', 'curry']),
  bball('curry-topps-chrome-2425', 'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Topps', 'Chrome', '137', null, false, ['steph', 'curry']),

  // ── Giannis Antetokounmpo ─────────────────────────────────────────────────
  bball('giannis-prizm-base-2425', 'Giannis Antetokounmpo', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '43', null, false, ['giannis', 'greek freak']),
  bball('giannis-prizm-silver-2425', 'Giannis Antetokounmpo', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '43', 'Silver Prizm', false, ['giannis', 'greek freak']),
  bball('giannis-select-base-2425', 'Giannis Antetokounmpo', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Select', '43', null, false, ['giannis']),

  // ── Nikola Jokic ─────────────────────────────────────────────────────────
  bball('jokic-prizm-base-2425', 'Nikola Jokic', 'Denver Nuggets', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '77', null, false, ['jokic', 'joker']),
  bball('jokic-prizm-silver-2425', 'Nikola Jokic', 'Denver Nuggets', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '77', 'Silver Prizm', false, ['jokic', 'joker']),
  bball('jokic-select-base-2425', 'Nikola Jokic', 'Denver Nuggets', 'NBA', '2024-25', 2024, 'Panini', 'Select', '77', null, false, ['jokic']),

  // ── Luka Doncic ──────────────────────────────────────────────────────────
  bball('luka-prizm-base-2425', 'Luka Doncic', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '3', null, false, ['luka', 'doncic']),
  bball('luka-prizm-silver-2425', 'Luka Doncic', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '3', 'Silver Prizm', false, ['luka', 'doncic']),
  bball('luka-prizm-rc-1920', 'Luka Doncic', 'Dallas Mavericks', 'NBA', '2019-20', 2019, 'Panini', 'Prizm', '280', null, true, ['luka', 'doncic']),
  bball('luka-prizm-silver-rc-1920', 'Luka Doncic', 'Dallas Mavericks', 'NBA', '2019-20', 2019, 'Panini', 'Prizm', '280', 'Silver Prizm', true, ['luka', 'doncic']),
  bball('luka-select-base-2425', 'Luka Doncic', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Select', '3', null, false, ['luka', 'doncic']),

  // ── Jayson Tatum ─────────────────────────────────────────────────────────
  bball('tatum-prizm-base-2425', 'Jayson Tatum', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '115', null, false, ['tatum', 'jayson', 'jt']),
  bball('tatum-prizm-silver-2425', 'Jayson Tatum', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '115', 'Silver Prizm', false, ['tatum', 'jayson']),
  bball('tatum-select-base-2425', 'Jayson Tatum', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Select', '115', null, false, ['tatum', 'jayson']),

  // ── Shai Gilgeous-Alexander ───────────────────────────────────────────────
  bball('sga-prizm-base-2425', 'Shai Gilgeous-Alexander', 'Oklahoma City Thunder', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '196', null, false, ['sga', 'shai', 'gilgeous']),
  bball('sga-prizm-silver-2425', 'Shai Gilgeous-Alexander', 'Oklahoma City Thunder', 'NBA', '2024-25', 2024, 'Panini', 'Prizm', '196', 'Silver Prizm', false, ['sga', 'shai']),

  // ── Paolo Banchero ────────────────────────────────────────────────────────
  bball('banchero-prizm-base-rc-2223', 'Paolo Banchero', 'Orlando Magic', 'NBA', '2022-23', 2022, 'Panini', 'Prizm', '1', null, true, ['banchero', 'paolo']),
  bball('banchero-prizm-silver-rc-2223', 'Paolo Banchero', 'Orlando Magic', 'NBA', '2022-23', 2022, 'Panini', 'Prizm', '1', 'Silver Prizm', true, ['banchero', 'paolo']),
  bball('banchero-select-rc-2223', 'Paolo Banchero', 'Orlando Magic', 'NBA', '2022-23', 2022, 'Panini', 'Select', '1', null, true, ['banchero', 'paolo']),

  // ── Zion Williamson ───────────────────────────────────────────────────────
  bball('zion-prizm-base-rc-1920', 'Zion Williamson', 'New Orleans Pelicans', 'NBA', '2019-20', 2019, 'Panini', 'Prizm', '248', null, true, ['zion', 'williamson']),
  bball('zion-prizm-silver-rc-1920', 'Zion Williamson', 'New Orleans Pelicans', 'NBA', '2019-20', 2019, 'Panini', 'Prizm', '248', 'Silver Prizm', true, ['zion', 'williamson']),

  // ── Michael Jordan ────────────────────────────────────────────────────────
  bball('jordan-topps-chrome-base-1997', 'Michael Jordan', 'Chicago Bulls', 'NBA', '1997-98', 1997, 'Topps', 'Chrome', '139', null, false, ['jordan', 'mj', 'mike']),
  bball('jordan-fleer-base-rc-1986', 'Michael Jordan', 'Chicago Bulls', 'NBA', '1986-87', 1986, 'Fleer', 'Fleer', '57', null, true, ['jordan', 'mj', 'mike', 'rookie']),

  // ── Kobe Bryant ──────────────────────────────────────────────────────────
  bball('kobe-topps-chrome-rc-1996', 'Kobe Bryant', 'Los Angeles Lakers', 'NBA', '1996-97', 1996, 'Topps', 'Chrome', '138', null, true, ['kobe', 'bryant', 'black mamba']),
  bball('kobe-bowman-rc-1996', 'Kobe Bryant', 'Los Angeles Lakers', 'NBA', '1996-97', 1996, 'Bowman', 'Bowman', '138', null, true, ['kobe', 'bryant', 'black mamba']),
]
