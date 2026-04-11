import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // --- Card Catalog ---
  const catalogCards = [
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
    // Japanese variants
    { game: 'pokemon', cardName: 'Charizard ex', setName: '151', cardNumber: '199', rarity: 'SR', variant: null, language: 'JA', imageUrl: null, externalSource: 'pokemontcg', externalId: 'sv3pt5ja-199' },
    { game: 'pokemon', cardName: 'Pikachu', setName: 'Promo', cardNumber: null, rarity: 'Promo', variant: null, language: 'JA', imageUrl: null, externalSource: null, externalId: null },
  ]

  for (const card of catalogCards) {
    const normalized = [card.cardName, card.setName, card.cardNumber, card.variant, card.language, card.rarity]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    await prisma.cardCatalog.upsert({
      where: { id: `seed-${card.externalId ?? card.cardName + card.setName}` },
      update: {},
      create: {
        id: `seed-${card.externalId ?? card.cardName + card.setName}`,
        ...card,
        normalizedSearchText: normalized,
      },
    })
  }

  // --- Inventory Items ---

  // 1) Raw card (no grading)
  const rawCharizard = await prisma.inventoryItem.create({
    data: {
      game: 'pokemon',
      cardName: 'Charizard ex',
      setName: 'Obsidian Flames',
      cardNumber: '228',
      language: 'EN',
      rarity: 'Special Illustration Rare',
      variant: null,
      conditionRaw: 'NM',
      quantity: 2,
      purchasePrice: 85.00,
      purchaseDate: new Date('2024-10-15'),
      fees: 4.25,
      shippingCost: 3.99,
      source: 'eBay',
      notes: 'Bought from reputable seller, well packed',
      imageUrl: 'https://images.pokemontcg.io/sv3/228_hires.png',
      latestMarketPrice: 110.00,
      latestMarketSource: 'pricecharting',
      latestMarketCheckedAt: new Date(),
    },
  })

  // 2) PSA graded card
  const psaCharizard = await prisma.inventoryItem.create({
    data: {
      game: 'pokemon',
      cardName: 'Charizard',
      setName: 'Base Set',
      cardNumber: '4',
      language: 'EN',
      rarity: 'Holo Rare',
      variant: 'Shadowless',
      conditionRaw: null,
      gradingCompany: 'PSA',
      grade: '10',
      certNumber: '12345678',
      quantity: 1,
      purchasePrice: 8500.00,
      purchaseDate: new Date('2024-08-01'),
      fees: 425.00,
      shippingCost: 25.00,
      source: 'Heritage Auctions',
      imageUrl: 'https://images.pokemontcg.io/base1/4_hires.png',
      latestMarketPrice: 11000.00,
      latestMarketSource: 'pricecharting',
      latestMarketCheckedAt: new Date(),
    },
  })

  // 3) Item with missing image (manual override scenario)
  const missingImageItem = await prisma.inventoryItem.create({
    data: {
      game: 'pokemon',
      cardName: 'Pikachu',
      setName: 'Promo',
      cardNumber: null,
      language: 'JA',
      rarity: 'Promo',
      variant: 'Staff',
      conditionRaw: 'LP',
      quantity: 1,
      purchasePrice: 45.00,
      purchaseDate: new Date('2024-11-20'),
      fees: 0,
      shippingCost: 8.00,
      source: 'Yahoo Japan',
      notes: 'Japanese staff promo – need to find proper image',
      imageUrl: null,
      manualImageUrl: null,
    },
  })

  // 4) Item with manual price override
  const manualPriceItem = await prisma.inventoryItem.create({
    data: {
      game: 'pokemon',
      cardName: 'Umbreon VMAX',
      setName: 'Evolving Skies',
      cardNumber: '215',
      language: 'EN',
      rarity: 'Secret Rare',
      variant: 'Alternate Art',
      conditionRaw: 'NM',
      quantity: 1,
      purchasePrice: 180.00,
      purchaseDate: new Date('2024-09-05'),
      fees: 9.00,
      source: 'Local card shop',
      imageUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png',
      latestMarketPrice: 220.00,
      latestMarketSource: 'pricecharting',
      latestMarketCheckedAt: new Date(),
      priceOverride: 200.00,
      priceOverrideNote: 'Comps are inflated — using conservative estimate',
    },
  })

  // 5) Sold item (for transaction history)
  const soldItem = await prisma.inventoryItem.create({
    data: {
      game: 'pokemon',
      cardName: 'Mew ex',
      setName: 'Scarlet & Violet 151',
      cardNumber: '205',
      language: 'EN',
      rarity: 'Special Illustration Rare',
      quantity: 0,
      purchasePrice: 55.00,
      purchaseDate: new Date('2024-07-10'),
      fees: 2.75,
      shippingCost: 4.00,
      source: 'eBay',
      imageUrl: 'https://images.pokemontcg.io/sv3pt5/205_hires.png',
      latestMarketPrice: 75.00,
      latestMarketSource: 'pricecharting',
      latestMarketCheckedAt: new Date(),
    },
  })

  // --- Transactions ---

  // BUY for rawCharizard
  await prisma.transaction.create({
    data: {
      inventoryItemId: rawCharizard.id,
      type: 'BUY',
      quantity: 2,
      unitPrice: 85.00,
      fees: 4.25,
      shippingCost: 3.99,
      tax: 0,
      netAmount: -(2 * 85.00 + 4.25 + 3.99),
      transactionDate: new Date('2024-10-15'),
      platform: 'eBay',
    },
  })

  // BUY for soldItem
  await prisma.transaction.create({
    data: {
      inventoryItemId: soldItem.id,
      type: 'BUY',
      quantity: 1,
      unitPrice: 55.00,
      fees: 2.75,
      shippingCost: 4.00,
      tax: 0,
      netAmount: -(55.00 + 2.75 + 4.00),
      transactionDate: new Date('2024-07-10'),
      platform: 'eBay',
    },
  })

  // SELL for soldItem (realized P&L = 78 - 9 fees - 61.75 cost = +7.25)
  const costBasis = 55.00 + 2.75 + 4.00  // 61.75
  const saleGross = 78.00
  const saleFees = 8.58  // ~11% eBay fees
  const saleShipping = 4.50
  const netProceeds = saleGross - saleFees - saleShipping
  const realizedPnL = netProceeds - costBasis

  await prisma.transaction.create({
    data: {
      inventoryItemId: soldItem.id,
      type: 'SELL',
      quantity: 1,
      unitPrice: saleGross,
      fees: saleFees,
      shippingCost: saleShipping,
      tax: 0,
      netAmount: netProceeds,
      realizedPnL,
      transactionDate: new Date('2024-08-22'),
      platform: 'eBay',
      note: 'Quick flip, good margin',
    },
  })

  // --- Price comps for rawCharizard ---
  await prisma.priceComp.createMany({
    data: [
      {
        inventoryItemId: rawCharizard.id,
        title: 'Charizard ex OBF 228 - Near Mint',
        soldPrice: 108.00,
        soldDate: new Date('2024-12-01'),
        currency: 'USD',
        source: 'pricecharting',
        url: 'https://www.pricecharting.com/game/pokemon-obsidian-flames/charizard-ex-228',
        conditionGuess: 'NM',
      },
      {
        inventoryItemId: rawCharizard.id,
        title: 'Pokemon OBF Charizard ex 228/197 NM/M',
        soldPrice: 115.00,
        soldDate: new Date('2024-11-28'),
        currency: 'USD',
        source: 'pricecharting',
        conditionGuess: 'NM',
      },
      {
        inventoryItemId: rawCharizard.id,
        title: 'Charizard ex 228 OBF SIR Near Mint',
        soldPrice: 107.50,
        soldDate: new Date('2024-11-25'),
        currency: 'USD',
        source: 'pricecharting',
        conditionGuess: 'NM',
      },
    ],
  })

  console.log('Seed complete.')
  console.log(`  CardCatalog: ${catalogCards.length} cards`)
  console.log(`  InventoryItems: 5 items`)
  console.log(`  Transactions: 3 records`)
  console.log(`  PriceComps: 3 records`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
