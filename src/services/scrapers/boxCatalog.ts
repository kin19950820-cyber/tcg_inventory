/**
 * Curated catalog of popular sealed box products.
 * Covers Pokemon TCG booster boxes and ETBs for the most-collected modern sets.
 *
 * Each entry maps to a CardCatalog row with category='SEALED'.
 * `cardName`  = full product name
 * `setName`   = set / edition name
 * `variant`   = box type (Booster Box, ETB, etc.)
 * `game`      = tcg game (pokemon, mtg, …)
 * `imageUrl`  = set logo (used as placeholder artwork for the box)
 */

type BoxEntry = {
  id: string
  category: 'SEALED'
  game: string
  cardName: string
  setName: string
  variant: string
  language: string
  imageUrl: string | null
  normalizedSearchText: string
  externalSource: string
  externalId: string | null
}

function box(
  id: string,
  game: string,
  name: string,
  setName: string,
  boxType: string,
  setId: string | null,
  extraTokens = '',
): BoxEntry {
  const imageUrl = setId
    ? `https://images.pokemontcg.io/${setId}/logo.png`
    : null

  const searchText = [name, setName, boxType, game, 'sealed', 'box', extraTokens]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    id: `box-${id}`,
    category: 'SEALED',
    game,
    cardName: name,
    setName,
    variant: boxType,
    language: 'EN',
    imageUrl,
    normalizedSearchText: searchText,
    externalSource: 'manual',
    externalId: null,
  }
}

// ── Pokemon Booster Boxes ──────────────────────────────────────────────────────

const POKEMON_BOOSTER_BOXES: BoxEntry[] = [
  box('sv8-bbox',    'pokemon', 'Surging Sparks Booster Box',        'Surging Sparks',           'Booster Box', 'sv8',    'sv8 36 packs'),
  box('sv7-bbox',    'pokemon', 'Stellar Crown Booster Box',         'Stellar Crown',            'Booster Box', 'sv7',    'sv7 36 packs'),
  box('sv6pt5-bbox', 'pokemon', 'Shrouded Fable Booster Box',        'Shrouded Fable',           'Booster Box', 'sv6pt5', 'sv6pt5 36 packs'),
  box('sv6-bbox',    'pokemon', 'Twilight Masquerade Booster Box',   'Twilight Masquerade',      'Booster Box', 'sv6',    'sv6 36 packs'),
  box('sv5-bbox',    'pokemon', 'Temporal Forces Booster Box',       'Temporal Forces',          'Booster Box', 'sv5',    'sv5 36 packs'),
  box('sv4pt5-bbox', 'pokemon', 'Paldean Fates Booster Box',         'Paldean Fates',            'Booster Box', 'sv4pt5', 'sv4pt5 36 packs'),
  box('sv4-bbox',    'pokemon', 'Paradox Rift Booster Box',          'Paradox Rift',             'Booster Box', 'sv4',    'sv4 36 packs'),
  box('sv3pt5-bbox', 'pokemon', 'Scarlet & Violet 151 Booster Box',  'Scarlet & Violet 151',     'Booster Box', 'sv3pt5', 'sv3pt5 sv151 151 36 packs'),
  box('sv3-bbox',    'pokemon', 'Obsidian Flames Booster Box',       'Obsidian Flames',          'Booster Box', 'sv3',    'sv3 obf 36 packs'),
  box('sv2-bbox',    'pokemon', 'Paldea Evolved Booster Box',        'Paldea Evolved',           'Booster Box', 'sv2',    'sv2 36 packs'),
  box('sv1-bbox',    'pokemon', 'Scarlet & Violet Booster Box',      'Scarlet & Violet',         'Booster Box', 'sv1',    'sv1 base 36 packs'),
  box('swsh7-bbox',  'pokemon', 'Evolving Skies Booster Box',        'Evolving Skies',           'Booster Box', 'swsh7',  'swsh7 evs 36 packs'),
  box('swsh12-bbox', 'pokemon', 'Silver Tempest Booster Box',        'Silver Tempest',           'Booster Box', 'swsh12', 'swsh12 sst 36 packs'),
  box('swsh9-bbox',  'pokemon', 'Brilliant Stars Booster Box',       'Brilliant Stars',          'Booster Box', 'swsh9',  'swsh9 brs 36 packs'),
  box('swsh1-bbox',  'pokemon', 'Sword & Shield Booster Box',        'Sword & Shield',           'Booster Box', 'swsh1',  'swsh base 36 packs'),
  box('base1-bbox',  'pokemon', 'Base Set Booster Box',              'Base Set',                 'Booster Box', 'base1',  'base1 original 1999 36 packs'),
]

// ── Pokemon Elite Trainer Boxes ───────────────────────────────────────────────

const POKEMON_ETB: BoxEntry[] = [
  box('sv8-etb',    'pokemon', 'Surging Sparks Elite Trainer Box',       'Surging Sparks',       'Elite Trainer Box', 'sv8',    'sv8 etb 9 packs'),
  box('sv7-etb',    'pokemon', 'Stellar Crown Elite Trainer Box',        'Stellar Crown',        'Elite Trainer Box', 'sv7',    'sv7 etb 9 packs'),
  box('sv6pt5-etb', 'pokemon', 'Shrouded Fable Elite Trainer Box',       'Shrouded Fable',       'Elite Trainer Box', 'sv6pt5', 'sv6pt5 etb 9 packs'),
  box('sv6-etb',    'pokemon', 'Twilight Masquerade Elite Trainer Box',  'Twilight Masquerade',  'Elite Trainer Box', 'sv6',    'sv6 etb 9 packs'),
  box('sv5-etb',    'pokemon', 'Temporal Forces Elite Trainer Box',      'Temporal Forces',      'Elite Trainer Box', 'sv5',    'sv5 etb 9 packs'),
  box('sv4pt5-etb', 'pokemon', 'Paldean Fates Elite Trainer Box',        'Paldean Fates',        'Elite Trainer Box', 'sv4pt5', 'sv4pt5 etb 9 packs'),
  box('sv4-etb',    'pokemon', 'Paradox Rift Elite Trainer Box',         'Paradox Rift',         'Elite Trainer Box', 'sv4',    'sv4 etb 9 packs'),
  box('sv3pt5-etb', 'pokemon', 'Scarlet & Violet 151 Elite Trainer Box', 'Scarlet & Violet 151', 'Elite Trainer Box', 'sv3pt5', 'sv3pt5 sv151 151 etb 9 packs'),
  box('sv3-etb',    'pokemon', 'Obsidian Flames Elite Trainer Box',      'Obsidian Flames',      'Elite Trainer Box', 'sv3',    'sv3 obf etb 9 packs'),
  box('sv3-etb2',   'pokemon', 'Obsidian Flames Elite Trainer Box II',   'Obsidian Flames',      'Elite Trainer Box', 'sv3',    'sv3 obf etb ii 9 packs'),
  box('swsh7-etb',  'pokemon', 'Evolving Skies Elite Trainer Box',       'Evolving Skies',       'Elite Trainer Box', 'swsh7',  'swsh7 evs etb 9 packs'),
]

// ── Pokemon Special Collections / Tins ────────────────────────────────────────

const POKEMON_SPECIAL: BoxEntry[] = [
  box('sv3pt5-bundle', 'pokemon', 'Scarlet & Violet 151 Binder Collection',   'Scarlet & Violet 151', 'Collection Box', 'sv3pt5', 'sv3pt5 sv151 151 binder'),
  box('sv8-premcol',   'pokemon', 'Surging Sparks Premium Collection',         'Surging Sparks',       'Premium Collection', 'sv8',  'sv8'),
  box('sv3-tin',       'pokemon', 'Obsidian Flames Booster Bundle',            'Obsidian Flames',      'Bundle',         'sv3',    'sv3 obf 4 packs'),
  box('sv3pt5-case',   'pokemon', 'Scarlet & Violet 151 Booster Box Case',    'Scarlet & Violet 151', 'Case',           'sv3pt5', 'sv3pt5 sv151 151 case 6 boxes'),
  box('sv8-case',      'pokemon', 'Surging Sparks Booster Box Case',           'Surging Sparks',       'Case',           'sv8',    'sv8 case 6 boxes'),
  box('swsh7-case',    'pokemon', 'Evolving Skies Booster Box Case',           'Evolving Skies',       'Case',           'swsh7',  'swsh7 evs case 6 boxes'),
]

// ── MTG Booster Boxes ─────────────────────────────────────────────────────────

const MTG_BOXES: BoxEntry[] = [
  box('mtg-dsk-bbox',   'mtg', 'Duskmourn Booster Box (Play)',     'Duskmourn: House of Horror', 'Booster Box',  null, 'mtg magic gathering dsk 36 packs'),
  box('mtg-dsk-cbox',   'mtg', 'Duskmourn Collector Booster Box',  'Duskmourn: House of Horror', 'Collector Booster Box', null, 'mtg magic gathering dsk collector 12 packs'),
  box('mtg-blb-bbox',   'mtg', 'Bloomburrow Booster Box (Play)',   'Bloomburrow',                'Booster Box',  null, 'mtg magic gathering blb 36 packs'),
  box('mtg-blb-cbox',   'mtg', 'Bloomburrow Collector Booster Box','Bloomburrow',                'Collector Booster Box', null, 'mtg magic gathering blb collector 12 packs'),
  box('mtg-mh3-bbox',   'mtg', 'Modern Horizons 3 Booster Box',   'Modern Horizons 3',          'Booster Box',  null, 'mtg magic gathering mh3 36 packs'),
  box('mtg-mh3-cbox',   'mtg', 'Modern Horizons 3 Collector Booster Box', 'Modern Horizons 3',  'Collector Booster Box', null, 'mtg magic gathering mh3 collector'),
  box('mtg-otj-bbox',   'mtg', 'Outlaws of Thunder Junction Booster Box', 'Outlaws of Thunder Junction', 'Booster Box', null, 'mtg magic gathering otj 36 packs'),
]

// ── Full catalog export ────────────────────────────────────────────────────────

export const BOX_CATALOG_ENTRIES: BoxEntry[] = [
  ...POKEMON_BOOSTER_BOXES,
  ...POKEMON_ETB,
  ...POKEMON_SPECIAL,
  ...MTG_BOXES,
]
