import { getDashboardStats } from '@/services/pnlService'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/dashboard/StatCard'
import { RecentlyAdded, RecentlySold } from '@/components/dashboard/RecentCards'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle, ImageOff, Package,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [stats, recentItems, recentSells] = await Promise.all([
    getDashboardStats(),
    prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' }, take: 6, where: { quantity: { gt: 0 } } }),
    prisma.transaction.findMany({
      where: { type: 'SELL' },
      orderBy: { transactionDate: 'desc' },
      take: 6,
      include: { inventoryItem: { select: { cardName: true, setName: true, imageUrl: true } } },
    }),
  ])

  const portfolioGainPct = stats.totalCostBasis > 0
    ? ((stats.totalEstimatedValue - stats.totalCostBasis) / stats.totalCostBasis) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Portfolio overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/new">
            <Button size="sm">+ Add Card</Button>
          </Link>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cost Basis"
          value={formatCurrency(stats.totalCostBasis)}
          sub={`${stats.totalItems} active cards`}
          icon={Package}
        />
        <StatCard
          title="Estimated Value"
          value={formatCurrency(stats.totalEstimatedValue)}
          sub={`${portfolioGainPct >= 0 ? '+' : ''}${portfolioGainPct.toFixed(1)}% vs cost`}
          icon={DollarSign}
        />
        <StatCard
          title="Unrealized P&L"
          value={formatCurrency(Math.abs(stats.unrealizedPnL))}
          variant="pnl"
          pnlValue={stats.unrealizedPnL}
          currency
          icon={stats.unrealizedPnL >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          title="Realized P&L (Month)"
          value={formatCurrency(Math.abs(stats.realizedPnLThisMonth))}
          variant="pnl"
          pnlValue={stats.realizedPnLThisMonth}
          currency
          icon={stats.realizedPnLThisMonth >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      {/* Alerts */}
      {(stats.itemsNeedingPriceRefresh > 0 || stats.itemsMissingImage > 0) && (
        <div className="flex gap-3">
          {stats.itemsNeedingPriceRefresh > 0 && (
            <Link href="/pricing-review" className="flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-900/30 transition-colors">
              <AlertCircle size={15} />
              {stats.itemsNeedingPriceRefresh} card{stats.itemsNeedingPriceRefresh !== 1 ? 's' : ''} need price refresh
            </Link>
          )}
          {stats.itemsMissingImage > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-400">
              <ImageOff size={15} />
              {stats.itemsMissingImage} card{stats.itemsMissingImage !== 1 ? 's' : ''} missing image
            </div>
          )}
        </div>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-2 gap-4">
        <RecentlyAdded items={recentItems} />
        <RecentlySold sells={recentSells} />
      </div>
    </div>
  )
}
