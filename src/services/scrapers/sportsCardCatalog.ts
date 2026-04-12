/**
 * Curated sports card catalog — basketball focus.
 *
 * This is a static dataset upserted on every sync. No external API is used.
 * Covers: 2025 Draft Class RCs, current NBA/WNBA stars, and classic RCs.
 *
 * To add a player: call bball() following the pattern below and append to SPORTS_CATALOG_ENTRIES.
 * Each entry is deduped by its `id` slug on upsert, so duplicates are safe.
 */

import type { Prisma } from '@prisma/client'

type CatalogInput = Omit<Prisma.CardCatalogCreateInput, 'createdAt' | 'updatedAt'>

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

  // ── Victor Wembanyama ────────────────────────────────────────────────────────
  bball('wemby-prizm-base-rc-2324',      'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm',         '1',  null,                  true,  ['wemby', 'wembanyama']),
  bball('wemby-prizm-silver-rc-2324',    'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm',         '1',  'Silver Prizm',        true,  ['wemby', 'wembanyama']),
  bball('wemby-prizm-gold-rc-2324',      'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm',         '1',  'Gold Prizm /10',      true,  ['wemby', 'wembanyama']),
  bball('wemby-prizm-black-rc-2324',     'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Prizm',         '1',  'Black Prizm /1',      true,  ['wemby', 'wembanyama']),
  bball('wemby-select-rc-2324',          'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Select',        '1',  null,                  true,  ['wemby', 'wembanyama']),
  bball('wemby-optic-rc-2324',           'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Donruss Optic', '1',  null,                  true,  ['wemby', 'wembanyama']),
  bball('wemby-nba-hoops-rc-2324',       'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'NBA Hoops',     '1',  null,                  true,  ['wemby', 'wembanyama']),
  bball('wemby-mosaic-rc-2324',          'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Mosaic',        '1',  null,                  true,  ['wemby', 'wembanyama']),
  bball('wemby-chronicles-rc-2324',      'Victor Wembanyama', 'San Antonio Spurs', 'NBA', '2023-24', 2023, 'Panini', 'Chronicles',    '1',  null,                  true,  ['wemby', 'wembanyama']),

  // ── Cooper Flagg ─────────────────────────────────────────────────────────────
  bball('flagg-topps-chrome-base-rc',    'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '101', null,                     true, ['flagg', 'cooper']),
  bball('flagg-topps-chrome-silver-rc',  'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '101', 'Silver Refractor',       true, ['flagg', 'cooper']),
  bball('flagg-topps-chrome-gold-rc',    'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '101', 'Gold Refractor /50',     true, ['flagg', 'cooper']),
  bball('flagg-topps-chrome-red-rc',     'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '101', 'Red Refractor /5',       true, ['flagg', 'cooper']),
  bball('flagg-prizm-base-rc',           'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '101', null,                     true, ['flagg', 'cooper']),
  bball('flagg-prizm-silver-rc',         'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '101', 'Silver Prizm',           true, ['flagg', 'cooper']),
  bball('flagg-prizm-gold-rc',           'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '101', 'Gold Prizm /10',         true, ['flagg', 'cooper']),
  bball('flagg-select-base-rc',          'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Panini', 'Select',       '101', null,                     true, ['flagg', 'cooper']),
  bball('flagg-optic-base-rc',           'Cooper Flagg', 'Dallas Mavericks', 'NBA', '2025-26', 2025, 'Panini', 'Donruss Optic','101', null,                     true, ['flagg', 'cooper']),

  // ── Ace Bailey ───────────────────────────────────────────────────────────────
  bball('bailey-topps-chrome-base-rc',   'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '102', null,                     true, ['ace', 'bailey']),
  bball('bailey-topps-chrome-silver-rc', 'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '102', 'Silver Refractor',       true, ['ace', 'bailey']),
  bball('bailey-topps-chrome-gold-rc',   'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '102', 'Gold Refractor /50',     true, ['ace', 'bailey']),
  bball('bailey-prizm-base-rc',          'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '102', null,                     true, ['ace', 'bailey']),
  bball('bailey-prizm-silver-rc',        'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '102', 'Silver Prizm',           true, ['ace', 'bailey']),
  bball('bailey-prizm-gold-rc',          'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '102', 'Gold Prizm /10',         true, ['ace', 'bailey']),
  bball('bailey-select-base-rc',         'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Panini', 'Select',       '102', null,                     true, ['ace', 'bailey']),
  bball('bailey-optic-base-rc',          'Ace Bailey', 'New Jersey Nets', 'NBA', '2025-26', 2025, 'Panini', 'Donruss Optic','102', null,                     true, ['ace', 'bailey']),

  // ── Kon Knueppel ─────────────────────────────────────────────────────────────
  bball('kon-topps-chrome-base-rc',      'Kon Knueppel', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '103', null,                  true, ['kon', 'knueppel']),
  bball('kon-topps-chrome-silver-rc',    'Kon Knueppel', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '103', 'Silver Refractor',    true, ['kon', 'knueppel']),
  bball('kon-topps-chrome-gold-rc',      'Kon Knueppel', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '103', 'Gold Refractor /50',  true, ['kon', 'knueppel']),
  bball('kon-prizm-base-rc',             'Kon Knueppel', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '103', null,                  true, ['kon', 'knueppel']),
  bball('kon-prizm-silver-rc',           'Kon Knueppel', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '103', 'Silver Prizm',        true, ['kon', 'knueppel']),
  bball('kon-select-base-rc',            'Kon Knueppel', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Panini', 'Select',       '103', null,                  true, ['kon', 'knueppel']),
  bball('kon-optic-base-rc',             'Kon Knueppel', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Panini', 'Donruss Optic','103', null,                  true, ['kon', 'knueppel']),

  // ── Dylan Harper ─────────────────────────────────────────────────────────────
  bball('harper-topps-chrome-base-rc',   'Dylan Harper', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '104', null,               true, ['dylan', 'harper']),
  bball('harper-topps-chrome-silver-rc', 'Dylan Harper', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '104', 'Silver Refractor', true, ['dylan', 'harper']),
  bball('harper-prizm-base-rc',          'Dylan Harper', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '104', null,               true, ['dylan', 'harper']),
  bball('harper-prizm-silver-rc',        'Dylan Harper', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '104', 'Silver Prizm',     true, ['dylan', 'harper']),
  bball('harper-select-base-rc',         'Dylan Harper', 'San Antonio Spurs', 'NBA', '2025-26', 2025, 'Panini', 'Select',       '104', null,               true, ['dylan', 'harper']),

  // ── Tre Johnson ──────────────────────────────────────────────────────────────
  bball('tjohnson-topps-chrome-base-rc', 'Tre Johnson', 'Philadelphia 76ers', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',        '105', null,               true, ['tre', 'johnson']),
  bball('tjohnson-topps-chrome-silver-rc','Tre Johnson', 'Philadelphia 76ers', 'NBA', '2025-26', 2025, 'Topps', 'Chrome',       '105', 'Silver Refractor', true, ['tre', 'johnson']),
  bball('tjohnson-prizm-base-rc',         'Tre Johnson', 'Philadelphia 76ers', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',       '105', null,               true, ['tre', 'johnson']),
  bball('tjohnson-prizm-silver-rc',       'Tre Johnson', 'Philadelphia 76ers', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',       '105', 'Silver Prizm',     true, ['tre', 'johnson']),

  // ── VJ Edgecombe ─────────────────────────────────────────────────────────────
  bball('edgecombe-prizm-base-rc',       'VJ Edgecombe', 'Philadelphia 76ers', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '106', null,               true, ['vj', 'edgecombe']),
  bball('edgecombe-prizm-silver-rc',     'VJ Edgecombe', 'Philadelphia 76ers', 'NBA', '2025-26', 2025, 'Panini', 'Prizm',        '106', 'Silver Prizm',     true, ['vj', 'edgecombe']),
  bball('edgecombe-chrome-base-rc',      'VJ Edgecombe', 'Philadelphia 76ers', 'NBA', '2025-26', 2025, 'Topps',  'Chrome',       '106', null,               true, ['vj', 'edgecombe']),

  // ── Caitlin Clark ────────────────────────────────────────────────────────────
  bball('clark-topps-chrome-base-rc-2024',   'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Topps', 'Chrome',       '1', null,                 true, ['clark', 'caitlin', 'cc']),
  bball('clark-topps-chrome-silver-rc-2024', 'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Topps', 'Chrome',       '1', 'Silver Refractor',   true, ['clark', 'caitlin', 'cc']),
  bball('clark-topps-chrome-gold-rc-2024',   'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Topps', 'Chrome',       '1', 'Gold Refractor /50', true, ['clark', 'caitlin', 'cc']),
  bball('clark-prizm-wnba-base-rc-2024',     'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA',  '1', null,                 true, ['clark', 'caitlin', 'cc']),
  bball('clark-prizm-wnba-silver-rc-2024',   'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA',  '1', 'Silver Prizm',       true, ['clark', 'caitlin', 'cc']),
  bball('clark-prizm-wnba-gold-rc-2024',     'Caitlin Clark', 'Indiana Fever', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA',  '1', 'Gold Prizm /10',     true, ['clark', 'caitlin', 'cc']),

  // ── Angel Reese ──────────────────────────────────────────────────────────────
  bball('reese-topps-chrome-base-rc-2024',   'Angel Reese', 'Chicago Sky', 'WNBA', '2024', 2024, 'Topps', 'Chrome',      '2', null,                 true, ['angel', 'reese', 'bayou barbie']),
  bball('reese-topps-chrome-silver-rc-2024', 'Angel Reese', 'Chicago Sky', 'WNBA', '2024', 2024, 'Topps', 'Chrome',      '2', 'Silver Refractor',   true, ['angel', 'reese']),
  bball('reese-prizm-wnba-base-rc-2024',     'Angel Reese', 'Chicago Sky', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA', '2', null,                 true, ['angel', 'reese']),
  bball('reese-prizm-wnba-silver-rc-2024',   'Angel Reese', 'Chicago Sky', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA', '2', 'Silver Prizm',       true, ['angel', 'reese']),

  // ── Paige Bueckers ───────────────────────────────────────────────────────────
  bball('bueckers-topps-chrome-base-rc',     'Paige Bueckers', 'Dallas Wings', 'WNBA', '2025', 2025, 'Topps', 'Chrome',      '1', null,               true, ['paige', 'bueckers']),
  bball('bueckers-topps-chrome-silver-rc',   'Paige Bueckers', 'Dallas Wings', 'WNBA', '2025', 2025, 'Topps', 'Chrome',      '1', 'Silver Refractor', true, ['paige', 'bueckers']),
  bball('bueckers-prizm-wnba-base-rc',       'Paige Bueckers', 'Dallas Wings', 'WNBA', '2025', 2025, 'Panini', 'Prizm WNBA', '1', null,               true, ['paige', 'bueckers']),
  bball('bueckers-prizm-wnba-silver-rc',     'Paige Bueckers', 'Dallas Wings', 'WNBA', '2025', 2025, 'Panini', 'Prizm WNBA', '1', 'Silver Prizm',     true, ['paige', 'bueckers']),

  // ── A'ja Wilson ──────────────────────────────────────────────────────────────
  bball('aja-prizm-wnba-base-2425',     "A'ja Wilson", 'Las Vegas Aces', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA',  '5', null,           false, ['aja', 'wilson']),
  bball('aja-prizm-wnba-silver-2425',   "A'ja Wilson", 'Las Vegas Aces', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA',  '5', 'Silver Prizm', false, ['aja', 'wilson']),

  // ── Breanna Stewart ──────────────────────────────────────────────────────────
  bball('stewart-prizm-wnba-base-2425', 'Breanna Stewart', 'New York Liberty', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA',  '10', null,           false, ['stewie', 'stewart', 'breanna']),
  bball('stewart-prizm-wnba-silver-2425','Breanna Stewart','New York Liberty', 'WNBA', '2024', 2024, 'Panini', 'Prizm WNBA',  '10', 'Silver Prizm', false, ['stewie', 'stewart']),

  // ── LeBron James ─────────────────────────────────────────────────────────────
  bball('lebron-prizm-base-2425',       'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '1',  null,           false, ['lebron', 'james', 'lbj', 'king james']),
  bball('lebron-prizm-silver-2425',     'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '1',  'Silver Prizm', false, ['lebron', 'james', 'lbj']),
  bball('lebron-select-base-2425',      'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '1',  null,           false, ['lebron', 'james', 'lbj']),
  bball('lebron-topps-chrome-2425',     'LeBron James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Topps',  'Chrome',        '1',  null,           false, ['lebron', 'james', 'lbj']),
  bball('lebron-topps-chrome-rc-0304',  'LeBron James', 'Cleveland Cavaliers','NBA', '2003-04', 2003, 'Topps',  'Chrome',        '111',null,           true,  ['lebron', 'james', 'lbj', 'rookie']),
  bball('lebron-topps-chrome-silver-rc-0304','LeBron James','Cleveland Cavaliers','NBA','2003-04',2003,'Topps', 'Chrome',        '111','Silver Refractor',true,['lebron','james','lbj','rookie']),
  bball('lebron-ud-exquisite-rc-0304',  'LeBron James', 'Cleveland Cavaliers','NBA', '2003-04', 2003, 'Upper Deck','Exquisite',  '78', null,           true,  ['lebron', 'james', 'lbj', 'exquisite', 'rookie']),

  // ── Anthony Edwards ──────────────────────────────────────────────────────────
  bball('ant-prizm-base-2425',          'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '83', null,           false, ['ant', 'edwards', 'ant man']),
  bball('ant-prizm-silver-2425',        'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '83', 'Silver Prizm', false, ['ant', 'edwards', 'ant man']),
  bball('ant-select-base-2425',         'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '83', null,           false, ['ant', 'edwards']),
  bball('ant-optic-base-2425',          'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2024-25', 2024, 'Panini', 'Donruss Optic', '83', null,           false, ['ant', 'edwards']),
  bball('ant-prizm-base-rc-2021',       'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2020-21', 2020, 'Panini', 'Prizm',         '1',  null,           true,  ['ant', 'edwards', 'rc', 'rookie']),
  bball('ant-prizm-silver-rc-2021',     'Anthony Edwards', 'Minnesota Timberwolves', 'NBA', '2020-21', 2020, 'Panini', 'Prizm',         '1',  'Silver Prizm', true,  ['ant', 'edwards', 'rc', 'rookie']),

  // ── Stephen Curry ────────────────────────────────────────────────────────────
  bball('curry-prizm-base-2425',        'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '137', null,           false, ['steph', 'curry', 'stephen']),
  bball('curry-prizm-silver-2425',      'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '137', 'Silver Prizm', false, ['steph', 'curry', 'stephen']),
  bball('curry-select-base-2425',       'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '137', null,           false, ['steph', 'curry']),
  bball('curry-topps-chrome-2425',      'Stephen Curry', 'Golden State Warriors', 'NBA', '2024-25', 2024, 'Topps',  'Chrome',        '137', null,           false, ['steph', 'curry']),

  // ── Giannis Antetokounmpo ────────────────────────────────────────────────────
  bball('giannis-prizm-base-2425',      'Giannis Antetokounmpo', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '43', null,           false, ['giannis', 'greek freak']),
  bball('giannis-prizm-silver-2425',    'Giannis Antetokounmpo', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '43', 'Silver Prizm', false, ['giannis', 'greek freak']),
  bball('giannis-select-base-2425',     'Giannis Antetokounmpo', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '43', null,           false, ['giannis']),

  // ── Nikola Jokic ─────────────────────────────────────────────────────────────
  bball('jokic-prizm-base-2425',        'Nikola Jokic', 'Denver Nuggets', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '77', null,           false, ['jokic', 'joker']),
  bball('jokic-prizm-silver-2425',      'Nikola Jokic', 'Denver Nuggets', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '77', 'Silver Prizm', false, ['jokic', 'joker']),
  bball('jokic-select-base-2425',       'Nikola Jokic', 'Denver Nuggets', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '77', null,           false, ['jokic']),

  // ── Luka Doncic ──────────────────────────────────────────────────────────────
  bball('luka-prizm-base-2425',         'Luka Doncic', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '3',   null,           false, ['luka', 'doncic']),
  bball('luka-prizm-silver-2425',       'Luka Doncic', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '3',   'Silver Prizm', false, ['luka', 'doncic']),
  bball('luka-select-base-2425',        'Luka Doncic', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '3',   null,           false, ['luka', 'doncic']),
  bball('luka-prizm-rc-1920',           'Luka Doncic', 'Dallas Mavericks',   'NBA', '2018-19', 2018, 'Panini', 'Prizm',         '280', null,           true,  ['luka', 'doncic', 'rookie']),
  bball('luka-prizm-silver-rc-1920',    'Luka Doncic', 'Dallas Mavericks',   'NBA', '2018-19', 2018, 'Panini', 'Prizm',         '280', 'Silver Prizm', true,  ['luka', 'doncic', 'rookie']),
  bball('luka-topps-chrome-rc-1920',    'Luka Doncic', 'Dallas Mavericks',   'NBA', '2018-19', 2018, 'Topps',  'Chrome',        '175', null,           true,  ['luka', 'doncic', 'rookie']),

  // ── Jayson Tatum ─────────────────────────────────────────────────────────────
  bball('tatum-prizm-base-2425',        'Jayson Tatum', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '115', null,           false, ['tatum', 'jayson', 'jt']),
  bball('tatum-prizm-silver-2425',      'Jayson Tatum', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '115', 'Silver Prizm', false, ['tatum', 'jayson']),
  bball('tatum-select-base-2425',       'Jayson Tatum', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '115', null,           false, ['tatum', 'jayson']),

  // ── Shai Gilgeous-Alexander ──────────────────────────────────────────────────
  bball('sga-prizm-base-2425',          'Shai Gilgeous-Alexander', 'Oklahoma City Thunder', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '196', null,           false, ['sga', 'shai', 'gilgeous']),
  bball('sga-prizm-silver-2425',        'Shai Gilgeous-Alexander', 'Oklahoma City Thunder', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '196', 'Silver Prizm', false, ['sga', 'shai']),
  bball('sga-select-base-2425',         'Shai Gilgeous-Alexander', 'Oklahoma City Thunder', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '196', null,           false, ['sga', 'shai']),

  // ── Tyrese Haliburton ────────────────────────────────────────────────────────
  bball('hali-prizm-base-2425',         'Tyrese Haliburton', 'Indiana Pacers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '54', null,           false, ['hali', 'haliburton', 'tyrese']),
  bball('hali-prizm-silver-2425',       'Tyrese Haliburton', 'Indiana Pacers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '54', 'Silver Prizm', false, ['hali', 'haliburton', 'tyrese']),
  bball('hali-select-base-2425',        'Tyrese Haliburton', 'Indiana Pacers', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '54', null,           false, ['hali', 'haliburton']),
  bball('hali-prizm-rc-2122',           'Tyrese Haliburton', 'Sacramento Kings','NBA', '2020-21', 2020, 'Panini', 'Prizm',         '67', null,           true,  ['hali', 'haliburton', 'rookie']),

  // ── Jaylen Brown ─────────────────────────────────────────────────────────────
  bball('jbrown-prizm-base-2425',       'Jaylen Brown', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '25', null,           false, ['jb', 'jaylen', 'brown']),
  bball('jbrown-prizm-silver-2425',     'Jaylen Brown', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '25', 'Silver Prizm', false, ['jb', 'jaylen', 'brown']),
  bball('jbrown-select-base-2425',      'Jaylen Brown', 'Boston Celtics', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '25', null,           false, ['jb', 'brown']),

  // ── Devin Booker ─────────────────────────────────────────────────────────────
  bball('booker-prizm-base-2425',       'Devin Booker', 'Phoenix Suns', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '8',  null,           false, ['book', 'booker', 'devin']),
  bball('booker-prizm-silver-2425',     'Devin Booker', 'Phoenix Suns', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '8',  'Silver Prizm', false, ['book', 'booker', 'devin']),
  bball('booker-select-base-2425',      'Devin Booker', 'Phoenix Suns', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '8',  null,           false, ['book', 'booker']),
  bball('booker-prizm-rc-1516',         'Devin Booker', 'Phoenix Suns', 'NBA', '2015-16', 2015, 'Panini', 'Prizm',         '308',null,           true,  ['book', 'booker', 'rookie']),

  // ── Donovan Mitchell ─────────────────────────────────────────────────────────
  bball('mitchell-prizm-base-2425',     'Donovan Mitchell', 'Cleveland Cavaliers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '13', null,           false, ['spida', 'mitchell', 'donovan']),
  bball('mitchell-prizm-silver-2425',   'Donovan Mitchell', 'Cleveland Cavaliers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '13', 'Silver Prizm', false, ['spida', 'mitchell', 'donovan']),
  bball('mitchell-prizm-rc-1819',       'Donovan Mitchell', 'Utah Jazz',           'NBA', '2017-18', 2017, 'Panini', 'Prizm',  '16', null,           true,  ['spida', 'mitchell', 'rookie']),

  // ── Kevin Durant ─────────────────────────────────────────────────────────────
  bball('kd-prizm-base-2425',           'Kevin Durant', 'Phoenix Suns', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '3',   null,           false, ['kd', 'durant', 'kevin', 'slim reaper']),
  bball('kd-prizm-silver-2425',         'Kevin Durant', 'Phoenix Suns', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '3',   'Silver Prizm', false, ['kd', 'durant', 'kevin']),
  bball('kd-topps-chrome-rc-0708',      'Kevin Durant', 'Seattle SuperSonics','NBA','2007-08',2007, 'Topps',  'Chrome', '131', null,           true,  ['kd', 'durant', 'rookie']),

  // ── Damian Lillard ───────────────────────────────────────────────────────────
  bball('dame-prizm-base-2425',         'Damian Lillard', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '44',  null,           false, ['dame', 'lillard', 'damian']),
  bball('dame-prizm-silver-2425',       'Damian Lillard', 'Milwaukee Bucks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '44',  'Silver Prizm', false, ['dame', 'lillard', 'damian']),
  bball('dame-prizm-rc-1213',           'Damian Lillard', 'Portland Trail Blazers','NBA','2012-13',2012,'Panini','Prizm', '236', null,           true,  ['dame', 'lillard', 'rookie']),

  // ── Joel Embiid ──────────────────────────────────────────────────────────────
  bball('embiid-prizm-base-2425',       'Joel Embiid', 'Philadelphia 76ers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '6',   null,           false, ['embiid', 'joel', 'process']),
  bball('embiid-prizm-silver-2425',     'Joel Embiid', 'Philadelphia 76ers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '6',   'Silver Prizm', false, ['embiid', 'joel']),
  bball('embiid-prizm-rc-1516',         'Joel Embiid', 'Philadelphia 76ers', 'NBA', '2014-15', 2014, 'Panini', 'Prizm',  '295', null,           true,  ['embiid', 'joel', 'rookie']),

  // ── Trae Young ───────────────────────────────────────────────────────────────
  bball('trae-prizm-base-2425',         'Trae Young', 'Atlanta Hawks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '37', null,           false, ['trae', 'young', 'ice trae']),
  bball('trae-prizm-silver-2425',       'Trae Young', 'Atlanta Hawks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '37', 'Silver Prizm', false, ['trae', 'young']),
  bball('trae-prizm-rc-1920',           'Trae Young', 'Atlanta Hawks', 'NBA', '2018-19', 2018, 'Panini', 'Prizm',  '78', null,           true,  ['trae', 'young', 'rookie']),
  bball('trae-prizm-silver-rc-1920',    'Trae Young', 'Atlanta Hawks', 'NBA', '2018-19', 2018, 'Panini', 'Prizm',  '78', 'Silver Prizm', true,  ['trae', 'young', 'rookie']),

  // ── Karl-Anthony Towns ───────────────────────────────────────────────────────
  bball('kat-prizm-base-2425',          'Karl-Anthony Towns', 'New York Knicks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '118', null,           false, ['kat', 'karl', 'towns', 'kta']),
  bball('kat-prizm-silver-2425',        'Karl-Anthony Towns', 'New York Knicks', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '118', 'Silver Prizm', false, ['kat', 'karl', 'towns']),

  // ── Tyrese Maxey ─────────────────────────────────────────────────────────────
  bball('maxey-prizm-base-2425',        'Tyrese Maxey', 'Philadelphia 76ers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '23', null,           false, ['maxey', 'tyrese']),
  bball('maxey-prizm-silver-2425',      'Tyrese Maxey', 'Philadelphia 76ers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '23', 'Silver Prizm', false, ['maxey', 'tyrese']),
  bball('maxey-prizm-rc-2122',          'Tyrese Maxey', 'Philadelphia 76ers', 'NBA', '2020-21', 2020, 'Panini', 'Prizm',  '84', null,           true,  ['maxey', 'tyrese', 'rookie']),

  // ── Cade Cunningham ──────────────────────────────────────────────────────────
  bball('cade-prizm-base-2425',         'Cade Cunningham', 'Detroit Pistons', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '5',  null,           false, ['cade', 'cunningham']),
  bball('cade-prizm-silver-2425',       'Cade Cunningham', 'Detroit Pistons', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '5',  'Silver Prizm', false, ['cade', 'cunningham']),
  bball('cade-prizm-rc-2122',           'Cade Cunningham', 'Detroit Pistons', 'NBA', '2021-22', 2021, 'Panini', 'Prizm',  '1',  null,           true,  ['cade', 'cunningham', 'rookie']),
  bball('cade-prizm-silver-rc-2122',    'Cade Cunningham', 'Detroit Pistons', 'NBA', '2021-22', 2021, 'Panini', 'Prizm',  '1',  'Silver Prizm', true,  ['cade', 'cunningham', 'rookie']),

  // ── Scottie Barnes ───────────────────────────────────────────────────────────
  bball('barnes-prizm-rc-2122',         'Scottie Barnes', 'Toronto Raptors', 'NBA', '2021-22', 2021, 'Panini', 'Prizm',  '1',  null,           true,  ['scottie', 'barnes']),
  bball('barnes-prizm-silver-rc-2122',  'Scottie Barnes', 'Toronto Raptors', 'NBA', '2021-22', 2021, 'Panini', 'Prizm',  '1',  'Silver Prizm', true,  ['scottie', 'barnes', 'rookie']),
  bball('barnes-prizm-base-2425',       'Scottie Barnes', 'Toronto Raptors', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '15', null,           false, ['scottie', 'barnes']),

  // ── Franz Wagner ─────────────────────────────────────────────────────────────
  bball('franz-prizm-rc-2122',          'Franz Wagner', 'Orlando Magic', 'NBA', '2021-22', 2021, 'Panini', 'Prizm',  '5',  null,           true,  ['franz', 'wagner']),
  bball('franz-prizm-silver-rc-2122',   'Franz Wagner', 'Orlando Magic', 'NBA', '2021-22', 2021, 'Panini', 'Prizm',  '5',  'Silver Prizm', true,  ['franz', 'wagner', 'rookie']),
  bball('franz-prizm-base-2425',        'Franz Wagner', 'Orlando Magic', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '17', null,           false, ['franz', 'wagner']),

  // ── Kawhi Leonard ────────────────────────────────────────────────────────────
  bball('kawhi-prizm-base-2425',        'Kawhi Leonard', 'LA Clippers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '58', null,           false, ['kawhi', 'leonard', 'the claw']),
  bball('kawhi-prizm-silver-2425',      'Kawhi Leonard', 'LA Clippers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '58', 'Silver Prizm', false, ['kawhi', 'leonard']),

  // ── Bam Adebayo ──────────────────────────────────────────────────────────────
  bball('bam-prizm-base-2425',          'Bam Adebayo', 'Miami Heat', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '74', null,           false, ['bam', 'adebayo']),
  bball('bam-prizm-silver-2425',        'Bam Adebayo', 'Miami Heat', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '74', 'Silver Prizm', false, ['bam', 'adebayo']),

  // ── Paolo Banchero ────────────────────────────────────────────────────────────
  bball('banchero-prizm-base-rc-2223',  'Paolo Banchero', 'Orlando Magic', 'NBA', '2022-23', 2022, 'Panini', 'Prizm',  '1', null,           true, ['banchero', 'paolo']),
  bball('banchero-prizm-silver-rc-2223','Paolo Banchero', 'Orlando Magic', 'NBA', '2022-23', 2022, 'Panini', 'Prizm',  '1', 'Silver Prizm', true, ['banchero', 'paolo']),
  bball('banchero-select-rc-2223',      'Paolo Banchero', 'Orlando Magic', 'NBA', '2022-23', 2022, 'Panini', 'Select', '1', null,           true, ['banchero', 'paolo']),
  bball('banchero-prizm-base-2425',     'Paolo Banchero', 'Orlando Magic', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '4', null,           false,['banchero', 'paolo']),

  // ── Zion Williamson ──────────────────────────────────────────────────────────
  bball('zion-prizm-base-rc-1920',      'Zion Williamson', 'New Orleans Pelicans', 'NBA', '2019-20', 2019, 'Panini', 'Prizm',  '248', null,           true, ['zion', 'williamson']),
  bball('zion-prizm-silver-rc-1920',    'Zion Williamson', 'New Orleans Pelicans', 'NBA', '2019-20', 2019, 'Panini', 'Prizm',  '248', 'Silver Prizm', true, ['zion', 'williamson']),
  bball('zion-prizm-base-2425',         'Zion Williamson', 'New Orleans Pelicans', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',  '21', null,           false,['zion', 'williamson']),

  // ── Bronny James ─────────────────────────────────────────────────────────────
  bball('bronny-prizm-base-rc-2425',    'Bronny James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '254', null,           true, ['bronny']),
  bball('bronny-prizm-silver-rc-2425',  'Bronny James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Prizm',         '254', 'Silver Prizm', true, ['bronny']),
  bball('bronny-select-rc-2425',        'Bronny James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Panini', 'Select',        '254', null,           true, ['bronny']),
  bball('bronny-chrome-rc-2425',        'Bronny James', 'Los Angeles Lakers', 'NBA', '2024-25', 2024, 'Topps',  'Chrome',        '254', null,           true, ['bronny']),

  // ── Michael Jordan ────────────────────────────────────────────────────────────
  bball('jordan-fleer-rc-8687',         'Michael Jordan', 'Chicago Bulls', 'NBA', '1986-87', 1986, 'Fleer',  'Fleer',         '57',  null,           true,  ['jordan', 'mj', 'mike', 'air jordan']),
  bball('jordan-topps-chrome-9798',     'Michael Jordan', 'Chicago Bulls', 'NBA', '1997-98', 1997, 'Topps',  'Chrome',        '139', null,           false, ['jordan', 'mj', 'mike']),
  bball('jordan-ud-hologrfx-rc-8990',   'Michael Jordan', 'Chicago Bulls', 'NBA', '1989-90', 1989, 'Upper Deck','Upper Deck', '5',   null,           false, ['jordan', 'mj', 'upper deck']),

  // ── Kobe Bryant ──────────────────────────────────────────────────────────────
  bball('kobe-topps-chrome-rc-9697',    'Kobe Bryant', 'Los Angeles Lakers', 'NBA', '1996-97', 1996, 'Topps',  'Chrome',  '138', null,           true,  ['kobe', 'bryant', 'black mamba']),
  bball('kobe-bowman-rc-9697',          'Kobe Bryant', 'Los Angeles Lakers', 'NBA', '1996-97', 1996, 'Bowman', 'Bowman',  '138', null,           true,  ['kobe', 'bryant', 'black mamba']),
  bball('kobe-ud-rc-9697',              'Kobe Bryant', 'Los Angeles Lakers', 'NBA', '1996-97', 1996, 'Upper Deck','Upper Deck','58',null,         true,  ['kobe', 'bryant', 'upper deck']),
  bball('kobe-prizm-base-1415',         'Kobe Bryant', 'Los Angeles Lakers', 'NBA', '2014-15', 2014, 'Panini', 'Prizm',   '24', null,            false, ['kobe', 'bryant']),

  // ── Tim Duncan ────────────────────────────────────────────────────────────────
  bball('duncan-topps-chrome-rc-9798',  'Tim Duncan', 'San Antonio Spurs', 'NBA', '1997-98', 1997, 'Topps', 'Chrome',        '115', null,          true,  ['tim', 'duncan', 'tduncan', 'fundamental']),
  bball('duncan-finest-rc-9798',        'Tim Duncan', 'San Antonio Spurs', 'NBA', '1997-98', 1997, 'Topps', 'Finest',         '101',null,          true,  ['tim', 'duncan', 'finest']),

  // ── Kevin Garnett ─────────────────────────────────────────────────────────────
  bball('kg-topps-chrome-rc-9596',      'Kevin Garnett', 'Minnesota Timberwolves', 'NBA', '1995-96', 1995, 'Topps', 'Chrome',  '190', null,        true,  ['kg', 'garnett', 'kevin', 'big ticket']),
  bball('kg-finest-rc-9596',            'Kevin Garnett', 'Minnesota Timberwolves', 'NBA', '1995-96', 1995, 'Topps', 'Finest',   '115',null,        true,  ['kg', 'garnett', 'finest']),

  // ── Shaquille O'Neal ─────────────────────────────────────────────────────────
  bball('shaq-topps-chrome-rc-9293',    "Shaquille O'Neal", 'Orlando Magic', 'NBA', '1992-93', 1992, 'Topps', 'Stadium Club', '1',  null,          true,  ['shaq', "o'neal", 'shaquille', 'diesel']),
  bball('shaq-fleer-rc-9293',           "Shaquille O'Neal", 'Orlando Magic', 'NBA', '1992-93', 1992, 'Fleer', 'Fleer',         '401',null,         true,  ['shaq', "o'neal", 'shaquille']),

  // ── Magic Johnson ─────────────────────────────────────────────────────────────
  bball('magic-topps-rc-8081',          'Magic Johnson', 'Los Angeles Lakers', 'NBA', '1980-81', 1980, 'Topps', 'Topps',  '139', null,            true,  ['magic', 'johnson', 'earvin', 'showtime']),

  // ── Larry Bird ────────────────────────────────────────────────────────────────
  bball('bird-topps-rc-8081',           'Larry Bird', 'Boston Celtics', 'NBA', '1980-81', 1980, 'Topps', 'Topps',  '139', null,                   true,  ['larry', 'bird', 'legend']),

  // ── Dwyane Wade RC ────────────────────────────────────────────────────────────
  bball('wade-topps-chrome-rc-0304',    'Dwyane Wade', 'Miami Heat', 'NBA', '2003-04', 2003, 'Topps', 'Chrome',        '115', null,               true,  ['wade', 'dwyane', 'dwade', 'flash']),
  bball('wade-topps-chrome-silver-rc-0304','Dwyane Wade','Miami Heat', 'NBA', '2003-04',2003,'Topps', 'Chrome',        '115', 'Silver Refractor',  true,  ['wade', 'dwyane', 'flash', 'rookie']),
]
