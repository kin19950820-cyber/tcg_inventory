import { NextRequest, NextResponse } from 'next/server'
import { searchCards, getTopCards, getCatalogStats } from '@/services/cardSearchService'

export async function GET(req: NextRequest) {
  const q        = req.nextUrl.searchParams.get('q') ?? ''
  const limit    = parseInt(req.nextUrl.searchParams.get('limit') ?? '12')
  const top      = req.nextUrl.searchParams.get('top') === '1'
  const stats    = req.nextUrl.searchParams.get('stats') === '1'
  const category = req.nextUrl.searchParams.get('category') ?? undefined   // e.g. "SEALED"

  // ?stats=1 — return catalog counts for the status bar
  if (stats) {
    const s = await getCatalogStats()
    return NextResponse.json(s)
  }

  // ?top=1 or empty q — return top/popular items (filtered by category if provided)
  if (top || q.length < 2) {
    const results = await getTopCards(limit, category)
    return NextResponse.json({ results, total: results.length, source: 'top' })
  }

  const results = await searchCards(q, limit, category)
  return NextResponse.json({ results, total: results.length, source: 'search' })
}
