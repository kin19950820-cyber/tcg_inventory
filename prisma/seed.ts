import { PrismaClient } from '@prisma/client'
import { buildNormalizedSearchText } from '../src/lib/fuzzy'

const prisma = new PrismaClient()

// ── Helper ────────────────────────────────────────────────────────────────────
function nsText(fields: Parameters<typeof buildNormalizedSearchText>[0]) {
  return buildNormalizedSearchText(fields)
}

async function main() {
  console.log('Seeding database...')

  // ── TCG Card Catalog ─────────────────────────────────────────────────────
  const tcgCatalogCards = [
    { game: 'pokemon', cardName: 'Charizard', setName: 'Base Set', cardNumber: '4', rarity: 'Holo Rare', variant: 'Shadowless', language: 'EN', imageUrl: 'https://images.pokemontcg.io/base1/4_hires.png', externalSource: 'pokemontcg', externalId: 'base1-4' },
    { game: 'pokemon', cardName: 'Charizard ex', setName: 'Scarlet & Violet 151', cardNumber: '199', rarity: 'Special Illustration Rare', variant: null, language: 'EN', imageUrl: 'https://images.pokemontcg.io/sv3pt5/199_hires.png', externalSource: 'pokemontcg', externalId: 'sv3pt5-199' },
    { game: 'pokemon', cardName: 'Pikachu', setName: 'Celebrations', cardNumber: '1', rarity: 'Promo', variant: null, language: 'EN', imageUrl: 'https://images.pokemontcg.io/cel25/1_hires.png', externalSource: 'pokemontcg', externalId: 'cel25-1' },
    { game: 'pokemon', cardName: 'Umbreon VMAX', setName: 'Evolving Skies', cardNumber: '215', rarity: 'Secret Rare', variant: 'Alternate Art', language: 'EN', imageUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png', externalSource: 'pokemontcg', externalId: 'swsh7-215' },
    { game: 'pokemon', cardName: 'Mew ex', setName: 'Scarlet & Violet 151', cardNumber: '205', rarity: 'Special Illustration Rare', variant: null, language: 'EN', imageUrl: 'https://images.pokemontcg.io/sv3pt5/205_hires.png', externalSource: 'pokemontcg', externalId: 'sv3pt5-205' },
    { game: 'pokemon', cardName: 'Mew', setName: 'Scarlet & Violet 151', cardNumber: '151', rarity: 'Illustration Rare', variant: null, language: 'EN', imageUrl: 'https://images.pokemontcg.io/sv3pt5/151_hires.png', externalSource: 'pokemontcg', externalId: 'sv3pt5-151' },
    { game: 'pokemon', cardName: 'Charizard ex', setName: 'Obsidian Flames', cardNumber: '228', rarity: 'Special Illustration Rare', variant: null, language: 'EN', imageUrl: 'https://images.pokemontcg.io/sv3/228_hires.png', externalSource: 'pokemontcg', externalId: 'sv3-228' },
    { game: 'pokemon', cardName: 'Pikachu ex', setName: 'Scarlet & Violet Promo', cardNumber: 'SVP EN 30', rarity: 'Promo', variant: null, language: 'EN', imageUrl: null, externalSource: 'pokemontcg', externalId: 'svp-en-030' },
    { game: 'pokemon', cardName: 'Rayquaza VMAX', setName: 'Evolving Skies', cardNumber: '217', rarity: 'Secret Rare', variant: 'Alternate Art', language: 'EN', imageUrl: 'https://images.pokemontcg.io/swsh7/217_hires.png', externalSource: 'pokemontcg', externalId: 'swsh7-217' },
    { game: 'pokemon', cardName: 'Lugia V', setName: 'Silver Tempest', cardNumber: '186', rarity: 'Special Illustration Rare', variant: null, language: 'EN', imageUrl: 'https://images.pokemontcg.io/swsh12/186_hires.png', externalSource: 'pokemontcg', externalId: 'swsh12-186' },
    { game: 'pokemon', cardName: 'Charizard ex', setName: '151', cardNumber: '199', rarity: 'SR', variant: null, language: 'JA', imageUrl: null, externalSource: 'pokemontcg', externalId: 'sv3pt5ja-199' },
    { game: 'pokemon', cardName: 'Pikachu', setName: 'Promo', cardNumber: null, rarity: 'Promo', variant: null, language: 'JA', imageUrl: null, externalSource: null, externalId: null },
  ]

  for (const card of tcgCatalogCards) {
    const normalized = nsText({ cardName: card.cardName, setName: card.setName, cardNumber: card.cardNumber, variant: card.variant, language: card.language, rarity: card.rarity })
    await prisma.cardCatalog.upsert({
      where: { id: `seed-${card.externalId ?? card.cardName + card.setName}` },
      update: {},
      create: {
        id: `seed-${card.externalId ?? card.cardName + card.setName}`,
        category: 'TCG',
        ...card,
        normalizedSearchText: normalized,
      },
    })
  }

  // ── Sports Card Catalog (Basketball) ────────────────────────────────────
  type SportsCatalogEntry = {
    id: string
    game: string
    cardName: string
    setName: string
    cardNumber: string
    category: string
    sport: string
    league: string
    season: string
    manufacturer: string
    brand: string
    productLine: string
    parallel: string | null
    insertName: string | null
    rookie: boolean
    autograph: boolean
    memorabilia: boolean
    serialNumbered: boolean
    playerName: string
    teamName: string
    year: number
    imageUrl: string | null
    externalSource: string | null
    externalId: string | null
  }

  const sportsCatalogCards: SportsCatalogEntry[] = [
    // Victor Wembanyama
    {
      id: 'seed-sports-wemby-prizm-base-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2023-24', year: 2023, manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
      cardName: 'Victor Wembanyama', playerName: 'Victor Wembanyama', teamName: 'San Antonio Spurs',
      setName: '2023-24 Panini Prizm Basketball', cardNumber: '1',
      parallel: null, insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    {
      id: 'seed-sports-wemby-prizm-silver-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2023-24', year: 2023, manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
      cardName: 'Victor Wembanyama', playerName: 'Victor Wembanyama', teamName: 'San Antonio Spurs',
      setName: '2023-24 Panini Prizm Basketball', cardNumber: '1',
      parallel: 'Silver Prizm', insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    {
      id: 'seed-sports-wemby-select-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2023-24', year: 2023, manufacturer: 'Panini', brand: 'Select', productLine: 'Basketball',
      cardName: 'Victor Wembanyama', playerName: 'Victor Wembanyama', teamName: 'San Antonio Spurs',
      setName: '2023-24 Panini Select Basketball', cardNumber: '1',
      parallel: null, insertName: 'Rookie Concourse', rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    // LeBron James
    {
      id: 'seed-sports-lebron-prizm-2425',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2024-25', year: 2024, manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
      cardName: 'LeBron James', playerName: 'LeBron James', teamName: 'Los Angeles Lakers',
      setName: '2024-25 Panini Prizm Basketball', cardNumber: '1',
      parallel: null, insertName: null, rookie: false, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    // Anthony Edwards
    {
      id: 'seed-sports-ant-prizm-silver-2425',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2024-25', year: 2024, manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
      cardName: 'Anthony Edwards', playerName: 'Anthony Edwards', teamName: 'Minnesota Timberwolves',
      setName: '2024-25 Panini Prizm Basketball', cardNumber: '83',
      parallel: 'Silver Prizm', insertName: null, rookie: false, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    // Caitlin Clark
    {
      id: 'seed-sports-clark-topps-chrome-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'WNBA',
      season: '2024', year: 2024, manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
      cardName: 'Caitlin Clark', playerName: 'Caitlin Clark', teamName: 'Indiana Fever',
      setName: '2024 Topps Chrome Basketball', cardNumber: '1',
      parallel: null, insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    {
      id: 'seed-sports-clark-topps-chrome-silver-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'WNBA',
      season: '2024', year: 2024, manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
      cardName: 'Caitlin Clark', playerName: 'Caitlin Clark', teamName: 'Indiana Fever',
      setName: '2024 Topps Chrome Basketball', cardNumber: '1',
      parallel: 'Silver Refractor', insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    // Cooper Flagg (2025 draft class)
    {
      id: 'seed-sports-flagg-topps-chrome-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2025-26', year: 2025, manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
      cardName: 'Cooper Flagg', playerName: 'Cooper Flagg', teamName: 'Dallas Mavericks',
      setName: '2025-26 Topps Chrome Basketball', cardNumber: '101',
      parallel: null, insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    {
      id: 'seed-sports-flagg-topps-chrome-silver-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2025-26', year: 2025, manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
      cardName: 'Cooper Flagg', playerName: 'Cooper Flagg', teamName: 'Dallas Mavericks',
      setName: '2025-26 Topps Chrome Basketball', cardNumber: '101',
      parallel: 'Silver Refractor', insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    {
      id: 'seed-sports-flagg-topps-base-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2025-26', year: 2025, manufacturer: 'Topps', brand: 'Topps', productLine: 'Basketball',
      cardName: 'Cooper Flagg', playerName: 'Cooper Flagg', teamName: 'Dallas Mavericks',
      setName: '2025-26 Topps Basketball', cardNumber: '101',
      parallel: null, insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
    // Bronny James
    {
      id: 'seed-sports-bronny-prizm-rc',
      game: 'basketball', category: 'SPORTS', sport: 'Basketball', league: 'NBA',
      season: '2024-25', year: 2024, manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
      cardName: 'Bronny James', playerName: 'Bronny James', teamName: 'Los Angeles Lakers',
      setName: '2024-25 Panini Prizm Basketball', cardNumber: '254',
      parallel: null, insertName: null, rookie: true, autograph: false, memorabilia: false, serialNumbered: false,
      imageUrl: null, externalSource: 'manual', externalId: null,
    },
  ]

  for (const card of sportsCatalogCards) {
    const normalized = nsText({
      playerName: card.playerName, cardName: card.cardName,
      brand: card.brand, season: card.season, parallel: card.parallel,
      setName: card.setName, teamName: card.teamName, manufacturer: card.manufacturer,
      league: card.league, sport: card.sport, productLine: card.productLine,
      cardNumber: card.cardNumber,
    })
    await prisma.cardCatalog.upsert({
      where: { id: card.id },
      update: {},
      create: { ...card, normalizedSearchText: normalized },
    })
  }

  // ── TCG Inventory Items ──────────────────────────────────────────────────
  const rawCharizard = await prisma.inventoryItem.create({
    data: {
      category: 'TCG', game: 'pokemon',
      cardName: 'Charizard ex', setName: 'Obsidian Flames', cardNumber: '228',
      language: 'EN', rarity: 'Special Illustration Rare', conditionRaw: 'NM',
      quantity: 2, purchasePrice: 85.00, purchaseDate: new Date('2024-10-15'),
      fees: 4.25, shippingCost: 3.99, source: 'eBay',
      notes: 'Bought from reputable seller, well packed',
      imageUrl: 'https://images.pokemontcg.io/sv3/228_hires.png',
      latestMarketPrice: 110.00, latestMarketSource: 'pricecharting', latestMarketCheckedAt: new Date(),
    },
  })

  const psaCharizard = await prisma.inventoryItem.create({
    data: {
      category: 'TCG', game: 'pokemon',
      cardName: 'Charizard', setName: 'Base Set', cardNumber: '4',
      language: 'EN', rarity: 'Holo Rare', variant: 'Shadowless',
      gradingCompany: 'PSA', grade: '10', certNumber: '12345678',
      quantity: 1, purchasePrice: 8500.00, purchaseDate: new Date('2024-08-01'),
      fees: 425.00, shippingCost: 25.00, source: 'Heritage Auctions',
      imageUrl: 'https://images.pokemontcg.io/base1/4_hires.png',
      latestMarketPrice: 11000.00, latestMarketSource: 'pricecharting', latestMarketCheckedAt: new Date(),
    },
  })

  const umbVmax = await prisma.inventoryItem.create({
    data: {
      category: 'TCG', game: 'pokemon',
      cardName: 'Umbreon VMAX', setName: 'Evolving Skies', cardNumber: '215',
      language: 'EN', rarity: 'Secret Rare', variant: 'Alternate Art', conditionRaw: 'NM',
      quantity: 1, purchasePrice: 180.00, purchaseDate: new Date('2024-09-05'),
      fees: 9.00, source: 'Local card shop',
      imageUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png',
      latestMarketPrice: 220.00, latestMarketSource: 'pricecharting', latestMarketCheckedAt: new Date(),
      priceOverride: 200.00, priceOverrideNote: 'Comps are inflated — using conservative estimate',
    },
  })

  const soldMewEx = await prisma.inventoryItem.create({
    data: {
      category: 'TCG', game: 'pokemon',
      cardName: 'Mew ex', setName: 'Scarlet & Violet 151', cardNumber: '205',
      language: 'EN', rarity: 'Special Illustration Rare',
      quantity: 0, purchasePrice: 55.00, purchaseDate: new Date('2024-07-10'),
      fees: 2.75, shippingCost: 4.00, source: 'eBay',
      imageUrl: 'https://images.pokemontcg.io/sv3pt5/205_hires.png',
      latestMarketPrice: 75.00, latestMarketSource: 'pricecharting', latestMarketCheckedAt: new Date(),
    },
  })

  // ── Sports Inventory Items ────────────────────────────────────────────────
  const wembyPSA = await prisma.inventoryItem.create({
    data: {
      category: 'SPORTS', game: 'basketball',
      sport: 'Basketball', league: 'NBA', season: '2023-24', year: 2023,
      manufacturer: 'Panini', brand: 'Prizm', productLine: 'Basketball',
      cardName: 'Victor Wembanyama', playerName: 'Victor Wembanyama', teamName: 'San Antonio Spurs',
      setName: '2023-24 Panini Prizm Basketball', cardNumber: '1',
      parallel: 'Silver Prizm', rookie: true,
      gradingCompany: 'PSA', grade: '10', certNumber: '87654321',
      quantity: 1, purchasePrice: 850.00, purchaseDate: new Date('2024-03-15'),
      fees: 42.50, shippingCost: 12.00, source: 'eBay',
      latestMarketPrice: 1200.00, latestMarketSource: 'pricecharting', latestMarketCheckedAt: new Date(),
    },
  })

  const clarkChrome = await prisma.inventoryItem.create({
    data: {
      category: 'SPORTS', game: 'basketball',
      sport: 'Basketball', league: 'WNBA', season: '2024', year: 2024,
      manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
      cardName: 'Caitlin Clark', playerName: 'Caitlin Clark', teamName: 'Indiana Fever',
      setName: '2024 Topps Chrome Basketball', cardNumber: '1',
      parallel: null, rookie: true, conditionRaw: 'NM',
      quantity: 2, purchasePrice: 120.00, purchaseDate: new Date('2024-09-01'),
      fees: 6.00, shippingCost: 5.00, source: 'COMC',
      latestMarketPrice: 180.00, latestMarketSource: 'pricecharting', latestMarketCheckedAt: new Date(),
    },
  })

  const flaggChrome = await prisma.inventoryItem.create({
    data: {
      category: 'SPORTS', game: 'basketball',
      sport: 'Basketball', league: 'NBA', season: '2025-26', year: 2025,
      manufacturer: 'Topps', brand: 'Chrome', productLine: 'Basketball',
      cardName: 'Cooper Flagg', playerName: 'Cooper Flagg', teamName: 'Dallas Mavericks',
      setName: '2025-26 Topps Chrome Basketball', cardNumber: '101',
      parallel: 'Silver Refractor', rookie: true, conditionRaw: 'NM',
      quantity: 1, purchasePrice: 200.00, purchaseDate: new Date('2025-11-01'),
      fees: 10.00, shippingCost: 6.00, source: 'eBay',
    },
  })

  // ── Transactions ─────────────────────────────────────────────────────────

  // BUY rawCharizard
  await prisma.transaction.create({
    data: {
      inventoryItemId: rawCharizard.id, type: 'BUY', quantity: 2,
      unitPrice: 85.00, fees: 4.25, shippingCost: 3.99, tax: 0,
      netAmount: -(2 * 85.00 + 4.25 + 3.99),
      transactionDate: new Date('2024-10-15'), platform: 'eBay',
    },
  })

  // BUY + SELL soldMewEx
  await prisma.transaction.create({
    data: {
      inventoryItemId: soldMewEx.id, type: 'BUY', quantity: 1,
      unitPrice: 55.00, fees: 2.75, shippingCost: 4.00, tax: 0,
      netAmount: -(55.00 + 2.75 + 4.00),
      transactionDate: new Date('2024-07-10'), platform: 'eBay',
    },
  })
  const costBasis = 55.00 + 2.75 + 4.00
  const saleGross = 78.00, saleFees = 8.58, saleShipping = 4.50
  const netProceeds = saleGross - saleFees - saleShipping
  await prisma.transaction.create({
    data: {
      inventoryItemId: soldMewEx.id, type: 'SELL', quantity: 1,
      unitPrice: saleGross, fees: saleFees, shippingCost: saleShipping, tax: 0,
      netAmount: netProceeds, realizedPnL: netProceeds - costBasis,
      transactionDate: new Date('2024-08-22'), platform: 'eBay', note: 'Quick flip',
    },
  })

  // BUY wembyPSA
  await prisma.transaction.create({
    data: {
      inventoryItemId: wembyPSA.id, type: 'BUY', quantity: 1,
      unitPrice: 850.00, fees: 42.50, shippingCost: 12.00, tax: 0,
      netAmount: -(850.00 + 42.50 + 12.00),
      transactionDate: new Date('2024-03-15'), platform: 'eBay',
    },
  })

  // BUY clarkChrome
  await prisma.transaction.create({
    data: {
      inventoryItemId: clarkChrome.id, type: 'BUY', quantity: 2,
      unitPrice: 120.00, fees: 6.00, shippingCost: 5.00, tax: 0,
      netAmount: -(2 * 120.00 + 6.00 + 5.00),
      transactionDate: new Date('2024-09-01'), platform: 'COMC',
    },
  })

  // BUY flaggChrome
  await prisma.transaction.create({
    data: {
      inventoryItemId: flaggChrome.id, type: 'BUY', quantity: 1,
      unitPrice: 200.00, fees: 10.00, shippingCost: 6.00, tax: 0,
      netAmount: -(200.00 + 10.00 + 6.00),
      transactionDate: new Date('2025-11-01'), platform: 'eBay',
    },
  })

  // ── Price comps ───────────────────────────────────────────────────────────
  await prisma.priceComp.createMany({
    data: [
      {
        inventoryItemId: rawCharizard.id,
        title: 'Charizard ex OBF 228 - Near Mint',
        soldPrice: 108.00, soldDate: new Date('2024-12-01'), currency: 'USD',
        source: 'pricecharting', url: null, conditionGuess: 'NM',
      },
      {
        inventoryItemId: rawCharizard.id,
        title: 'Pokemon OBF Charizard ex 228/197 NM/M',
        soldPrice: 115.00, soldDate: new Date('2024-11-28'), currency: 'USD',
        source: 'pricecharting', conditionGuess: 'NM',
      },
      {
        inventoryItemId: wembyPSA.id,
        title: '2023-24 Panini Prizm Wembanyama Silver RC PSA 10',
        soldPrice: 1250.00, soldDate: new Date('2025-01-10'), currency: 'USD',
        source: 'pricecharting', conditionGuess: 'PSA 10',
      },
    ],
  })

  console.log('Seed complete.')
  console.log(`  CardCatalog: ${tcgCatalogCards.length} TCG + ${sportsCatalogCards.length} sports`)
  console.log('  InventoryItems: 4 TCG + 3 sports (1 sold)')
  console.log('  Transactions: 6 BUY + 1 SELL')
  console.log('  PriceComps: 3 records')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
