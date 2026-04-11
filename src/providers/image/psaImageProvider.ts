/**
 * PSA image provider
 * Tries to fetch the card image from PSA's cert lookup.
 *
 * PSA provides public cert info at:
 *   https://www.psacard.com/cert/{certNumber}
 * The image URL pattern is typically:
 *   https://storage.googleapis.com/psawebsite/{certNumber}-1.jpg
 *
 * Required env: PSA_API_KEY (optional — public cert lookup doesn't need a key)
 */
import type { InventoryItem } from '@prisma/client'
import type { ImageProviderResult } from '@/types'
import type { ImageProvider } from './types'

function buildPsaImageUrl(certNumber: string): string {
  const clean = certNumber.replace(/\D/g, '')
  return `https://storage.googleapis.com/psawebsite/${clean}-1.jpg`
}

async function imageExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', next: { revalidate: 86400 } })
    return res.ok
  } catch {
    return false
  }
}

export const psaImageProvider: ImageProvider = {
  name: 'psa',

  async getImageForCard(item: InventoryItem): Promise<ImageProviderResult> {
    if (!item.certNumber || item.gradingCompany !== 'PSA') {
      return { url: null, source: 'psa', cached: false }
    }

    const url = buildPsaImageUrl(item.certNumber)
    const exists = await imageExists(url)

    return {
      url: exists ? url : null,
      source: 'psa',
      cached: false,
    }
  },
}
