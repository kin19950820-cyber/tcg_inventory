/**
 * Fallback image provider — tries pokemontcg.io for Pokemon cards,
 * then falls back to the stored imageUrl, then null.
 */
import type { InventoryItem } from '@prisma/client'
import type { ImageProviderResult } from '@/types'
import type { ImageProvider } from './types'

export const fallbackImageProvider: ImageProvider = {
  name: 'fallback',

  async getImageForCard(item: InventoryItem): Promise<ImageProviderResult> {
    // Already have a stored URL → use it
    if (item.imageUrl) {
      return { url: item.imageUrl, source: 'stored', cached: true }
    }

    // For Pokemon, try pokemontcg.io search by set + number
    if (item.game === 'pokemon' && item.setName && item.cardNumber) {
      const url = await searchPokemonTcgIo(item)
      if (url) return { url, source: 'pokemontcg-io', cached: false }
    }

    return { url: null, source: 'fallback', cached: false }
  },
}

async function searchPokemonTcgIo(item: InventoryItem): Promise<string | null> {
  try {
    const q = encodeURIComponent(`name:"${item.cardName}" number:${item.cardNumber}`)
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${q}&select=id,images`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const json = await res.json()
    const card = json.data?.[0]
    return card?.images?.large ?? card?.images?.small ?? null
  } catch {
    return null
  }
}
