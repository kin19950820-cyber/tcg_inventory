import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryProducts } from '@/services/releases/releaseSyncService'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const filter = searchParams.get('filter') ?? 'all'
  const sort = searchParams.get('sort') ?? 'release-date'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '300'), 500)
  const upcoming = searchParams.get('upcoming')

  if (upcoming) {
    const days = parseInt(searchParams.get('days') ?? '60')
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() + days)

    const products = await queryProducts({ filter, sort, limit })
    const upcomingOnly = products.filter((p) => {
      const releaseInWindow = !!p.releaseDate && p.releaseDate >= now && p.releaseDate <= cutoff
      const preorderInWindow = !!p.preorderDate && p.preorderDate >= now && p.preorderDate <= cutoff
      return releaseInWindow || preorderInWindow
    })

    return NextResponse.json({ ok: true, data: upcomingOnly })
  }

  const status = searchParams.get('status')
  if (status) {
    const products = await queryProducts({ filter, sort, limit })
    const byStatus = products.filter((p) => p.productStatus === status)
    return NextResponse.json({ ok: true, data: byStatus })
  }

  const products = await queryProducts({ filter, sort, limit })
  return NextResponse.json({ ok: true, data: products })
}
