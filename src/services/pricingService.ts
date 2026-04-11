import { prisma } from '@/lib/prisma'
import { priceChartingProvider } from '@/providers/pricing/priceChartingProvider'
import { ebaySoldScraperProvider } from '@/providers/pricing/ebaySoldScraperProvider'
import { manualPriceProvider } from '@/providers/pricing/manualPriceProvider'
import type { InventoryItem } from '@prisma/client'
import type { NormalizedComp, PricingProviderResult } from '@/types'

const providers = [priceChartingProvider, ebaySoldScraperProvider]

export async function refreshPriceForItem(itemId: string): Promise<PricingProviderResult> {
  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } })

  // If manual override, just return that
  if (item.priceOverride) {
    return manualPriceProvider.getLatestComps(item)
  }

  let bestResult: PricingProviderResult = {
    comps: [],
    suggestedPrice: null,
    source: 'none',
    fetchedAt: new Date(),
    error: 'No providers returned data',
  }

  for (const provider of providers) {
    try {
      const result = await provider.getLatestComps(item)
      if (result.comps.length > 0 || result.suggestedPrice != null) {
        bestResult = result
        break  // stop after first successful provider
      }
    } catch {
      // continue to next provider
    }
  }

  // Persist comps and update item
  if (bestResult.comps.length > 0) {
    await prisma.$transaction([
      // Delete old comps for this item
      prisma.priceComp.deleteMany({ where: { inventoryItemId: itemId } }),
      // Insert fresh comps
      prisma.priceComp.createMany({
        data: bestResult.comps.map((c) => ({
          inventoryItemId: itemId,
          title: c.title,
          soldPrice: c.soldPrice,
          soldDate: c.soldDate,
          currency: c.currency,
          source: c.source,
          url: c.url,
          imageUrl: c.imageUrl,
          conditionGuess: c.conditionGuess,
          gradeGuess: c.gradeGuess,
        })),
      }),
    ])
  }

  if (bestResult.suggestedPrice != null) {
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        latestMarketPrice: bestResult.suggestedPrice,
        latestMarketSource: bestResult.source,
        latestMarketCheckedAt: bestResult.fetchedAt,
      },
    })
  }

  return bestResult
}

export async function refreshAllPrices(): Promise<{ updated: number; errors: number }> {
  const items = await prisma.inventoryItem.findMany({ where: { quantity: { gt: 0 } } })
  let updated = 0
  let errors = 0

  for (const item of items) {
    try {
      await refreshPriceForItem(item.id)
      updated++
    } catch {
      errors++
    }
  }

  return { updated, errors }
}

export async function getCompsForItem(itemId: string): Promise<NormalizedComp[]> {
  const comps = await prisma.priceComp.findMany({
    where: { inventoryItemId: itemId },
    orderBy: { fetchedAt: 'desc' },
  })

  return comps.map((c) => ({
    title: c.title,
    soldPrice: c.soldPrice,
    soldDate: c.soldDate,
    currency: c.currency,
    source: c.source,
    url: c.url,
    imageUrl: c.imageUrl,
    conditionGuess: c.conditionGuess,
    gradeGuess: c.gradeGuess,
  }))
}

export async function setManualPriceOverride(
  itemId: string,
  price: number,
  note?: string
): Promise<InventoryItem> {
  return prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      priceOverride: price,
      priceOverrideNote: note ?? null,
      latestMarketPrice: price,
      latestMarketSource: 'manual',
      latestMarketCheckedAt: new Date(),
    },
  })
}

export async function clearManualPriceOverride(itemId: string): Promise<InventoryItem> {
  return prisma.inventoryItem.update({
    where: { id: itemId },
    data: { priceOverride: null, priceOverrideNote: null },
  })
}
