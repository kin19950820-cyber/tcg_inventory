import { prisma } from '@/lib/prisma'
import { psaImageProvider } from '@/providers/image/psaImageProvider'
import { manualImageProvider } from '@/providers/image/manualImageProvider'
import { fallbackImageProvider } from '@/providers/image/fallbackImageProvider'
import type { InventoryItem } from '@prisma/client'
import type { ImageProviderResult } from '@/types'

export async function resolveImageForItem(item: InventoryItem): Promise<ImageProviderResult> {
  // Priority 1: Manual override
  const manual = await manualImageProvider.getImageForCard(item)
  if (manual.url) return manual

  // Priority 2: PSA image (only if graded by PSA with cert number)
  if (item.gradingCompany === 'PSA' && item.certNumber) {
    const psa = await psaImageProvider.getImageForCard(item)
    if (psa.url) return psa
  }

  // Priority 3: Fallback (stored URL or pokemontcg.io)
  return fallbackImageProvider.getImageForCard(item)
}

export async function resolveAndPersistImage(itemId: string): Promise<ImageProviderResult> {
  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } })
  const result = await resolveImageForItem(item)

  if (result.url && result.url !== item.imageUrl) {
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { imageUrl: result.url },
    })
  }

  return result
}

export async function setManualImage(itemId: string, url: string): Promise<InventoryItem> {
  return prisma.inventoryItem.update({
    where: { id: itemId },
    data: { manualImageUrl: url, imageUrl: url },
  })
}

export function getPlaceholderImage(): string {
  return '/card-placeholder.svg'
}
