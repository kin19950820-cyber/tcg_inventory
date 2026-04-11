import type { InventoryItem } from '@prisma/client'
import type { ImageProviderResult } from '@/types'
import type { ImageProvider } from './types'

export const manualImageProvider: ImageProvider = {
  name: 'manual',

  async getImageForCard(item: InventoryItem): Promise<ImageProviderResult> {
    if (!item.manualImageUrl) {
      return { url: null, source: 'manual', cached: false }
    }
    return { url: item.manualImageUrl, source: 'manual', cached: true }
  },
}
