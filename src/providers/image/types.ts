import type { InventoryItem } from '@prisma/client'
import type { ImageProviderResult } from '@/types'

export interface ImageProvider {
  name: string
  getImageForCard(item: InventoryItem): Promise<ImageProviderResult>
}
