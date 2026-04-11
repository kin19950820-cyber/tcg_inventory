import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/services/pnlService'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [stats, recentItems, recentSells] = await Promise.all([
    getDashboardStats(),
    prisma.inventoryItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      where: { quantity: { gt: 0 } },
    }),
    prisma.transaction.findMany({
      where: { type: 'SELL' },
      orderBy: { transactionDate: 'desc' },
      take: 5,
      include: { inventoryItem: { select: { cardName: true, setName: true, imageUrl: true } } },
    }),
  ])

  return NextResponse.json({ stats, recentItems, recentSells })
}
