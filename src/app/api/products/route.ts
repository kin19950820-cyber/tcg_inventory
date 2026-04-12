import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllProducts, getUpcomingReleases } from '@/services/productFollowService'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? undefined
  const upcoming = searchParams.get('upcoming')

  if (upcoming) {
    const days = parseInt(searchParams.get('days') ?? '60')
    const products = await getUpcomingReleases(days)
    return NextResponse.json({ ok: true, data: products })
  }

  const products = await getAllProducts(status)
  return NextResponse.json({ ok: true, data: products })
}
