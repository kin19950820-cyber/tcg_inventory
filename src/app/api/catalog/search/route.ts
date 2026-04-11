import { NextRequest, NextResponse } from 'next/server'
import { searchCards } from '@/services/cardSearchService'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '12')

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const results = await searchCards(q, limit)
  return NextResponse.json({ results })
}
