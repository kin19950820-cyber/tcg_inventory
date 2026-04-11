import { NextRequest, NextResponse } from 'next/server'
import { refreshPriceForItem, refreshAllPrices } from '@/services/pricingService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const itemId = body.itemId as string | undefined

    if (itemId) {
      const result = await refreshPriceForItem(itemId)
      return NextResponse.json({ ok: true, data: result })
    } else {
      const result = await refreshAllPrices()
      return NextResponse.json({ ok: true, data: result })
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
