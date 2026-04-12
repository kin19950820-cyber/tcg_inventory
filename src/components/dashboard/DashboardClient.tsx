'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  BarChart2,
  Layers,
  ShoppingBag,
  AlertCircle,
  ImageOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard } from './StatCard'
import { MoverSection, ItemMoverRow, SellMoverRow, MoverEmpty } from './MoverSection'
import { NeedsAttentionSection } from './NeedsAttentionSection'
import { formatCurrency } from '@/lib/utils'
import type { DashboardData } from '@/types'

const PortfolioCharts = dynamic(() => import('./PortfolioCharts'), { ssr: false })

const TIME_RANGES = ['7D', '30D', '90D', 'All'] as const
type TimeRange = (typeof TIME_RANGES)[number]

const RANGE_DAYS: Record<TimeRange, number> = { '7D': 7, '30D': 30, '90D': 90, All: Infinity }

export function DashboardClient({ data }: { data: DashboardData }) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'TCG' | 'SPORTS'>('all')
  const [gameFilter, setGameFilter] = useState('all')
  const [gradedFilter, setGradedFilter] = useState<'all' | 'graded' | 'raw'>('all')
  const [manufacturerFilter, setManufacturerFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('All')

  // Derived filter options from actual data
  const filterOptions = useMemo(() => {
    const movers = categoryFilter === 'all'
      ? data.allMovers
      : data.allMovers.filter((m) => m.category === categoryFilter)
    const games = new Set(movers.map((m) => m.game))
    const manufacturers = new Set(movers.filter((m) => m.manufacturer).map((m) => m.manufacturer!))
    const brands = new Set(movers.filter((m) => m.brand).map((m) => m.brand!))
    const seasons = new Set(movers.filter((m) => m.season).map((m) => m.season!))
    return {
      games: Array.from(games).sort(),
      manufacturers: Array.from(manufacturers).sort(),
      brands: Array.from(brands).sort(),
      seasons: Array.from(seasons).sort().reverse(),
    }
  }, [data.allMovers, categoryFilter])

  const showSportsFilters = categoryFilter === 'SPORTS' || categoryFilter === 'all'

  // Filter active holdings
  const filteredMovers = useMemo(() => {
    return data.allMovers.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false
      if (gameFilter !== 'all' && m.game !== gameFilter) return false
      if (gradedFilter === 'graded' && !m.gradingCompany) return false
      if (gradedFilter === 'raw' && m.gradingCompany) return false
      if (manufacturerFilter !== 'all' && m.manufacturer !== manufacturerFilter) return false
      if (brandFilter !== 'all' && m.brand !== brandFilter) return false
      if (seasonFilter !== 'all' && m.season !== seasonFilter) return false
      return true
    })
  }, [data.allMovers, categoryFilter, gameFilter, gradedFilter, manufacturerFilter, brandFilter, seasonFilter])

  // Filter sells by time range
  const filteredSells = useMemo(() => {
    const days = RANGE_DAYS[timeRange]
    if (days === Infinity) return data.allSells
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return data.allSells.filter((s) => new Date(s.transactionDate) >= cutoff)
  }, [data.allSells, timeRange])

  // Derived sections from filtered data
  const topGainers = useMemo(
    () =>
      [...filteredMovers]
        .filter((m) => m.unrealizedPnL != null)
        .sort((a, b) => (b.unrealizedPnL ?? 0) - (a.unrealizedPnL ?? 0))
        .slice(0, 5),
    [filteredMovers],
  )
  const topLosers = useMemo(
    () =>
      [...filteredMovers]
        .filter((m) => m.unrealizedPnL != null)
        .sort((a, b) => (a.unrealizedPnL ?? 0) - (b.unrealizedPnL ?? 0))
        .slice(0, 5),
    [filteredMovers],
  )
  const mostValuable = useMemo(
    () =>
      [...filteredMovers]
        .filter((m) => m.currentEstimatedValue != null)
        .sort((a, b) => (b.currentEstimatedValue ?? 0) - (a.currentEstimatedValue ?? 0))
        .slice(0, 5),
    [filteredMovers],
  )
  const largestPositions = useMemo(
    () =>
      [...filteredMovers]
        .sort((a, b) => b.remainingCostBasis - a.remainingCostBasis)
        .slice(0, 5),
    [filteredMovers],
  )
  const bestRealized = useMemo(
    () => [...filteredSells].sort((a, b) => b.realizedPnL - a.realizedPnL).slice(0, 5),
    [filteredSells],
  )
  const worstRealized = useMemo(
    () => [...filteredSells].sort((a, b) => a.realizedPnL - b.realizedPnL).slice(0, 5),
    [filteredSells],
  )
  const recentlySold = useMemo(() => filteredSells.slice(0, 6), [filteredSells])

  const { stats, needsAttention, chartData } = data

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Portfolio</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {stats.totalItems} active cards · {stats.totalQuantity} total units
          </p>
        </div>
        <Link href="/inventory/new">
          <Button size="sm">+ Add Card</Button>
        </Link>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Row 1: Category + Game/Sport + Graded/Raw + Time range */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category toggle */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {(['all', 'TCG', 'SPORTS'] as const).map((v) => (
              <button key={v} onClick={() => { setCategoryFilter(v); setGameFilter('all'); setManufacturerFilter('all'); setBrandFilter('all'); setSeasonFilter('all') }}
                className={`h-8 px-3 text-xs transition-colors ${categoryFilter === v ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
              >
                {v === 'all' ? 'All' : v}
              </button>
            ))}
          </div>

          {/* Game / Sport */}
          <FilterSelect
            value={gameFilter}
            onChange={setGameFilter}
            options={filterOptions.games}
            allLabel={categoryFilter === 'SPORTS' ? 'All Sports' : categoryFilter === 'TCG' ? 'All Games' : 'All Games/Sports'}
          />

          {/* Graded/Raw */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {(['all', 'graded', 'raw'] as const).map((v) => (
              <button key={v} onClick={() => setGradedFilter(v)}
                className={`h-8 px-3 text-xs capitalize transition-colors ${gradedFilter === v ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
              >
                {v === 'all' ? 'All' : v}
              </button>
            ))}
          </div>

          {/* Time range */}
          <div className="ml-auto flex rounded-lg border border-zinc-700 overflow-hidden">
            {TIME_RANGES.map((label) => (
              <button key={label} onClick={() => setTimeRange(label)}
                className={`h-8 px-3 text-xs transition-colors ${timeRange === label ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Sports-specific filters (shown when SPORTS or All with sports data) */}
        {showSportsFilters && (filterOptions.manufacturers.length > 0 || filterOptions.brands.length > 0 || filterOptions.seasons.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterOptions.manufacturers.length > 0 && (
              <FilterSelect value={manufacturerFilter} onChange={setManufacturerFilter} options={filterOptions.manufacturers} allLabel="All Manufacturers" />
            )}
            {filterOptions.brands.length > 0 && (
              <FilterSelect value={brandFilter} onChange={setBrandFilter} options={filterOptions.brands} allLabel="All Brands" />
            )}
            {filterOptions.seasons.length > 0 && (
              <FilterSelect value={seasonFilter} onChange={setSeasonFilter} options={filterOptions.seasons} allLabel="All Seasons" />
            )}
          </div>
        )}
      </div>

      {/* ── 9-stat grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          title="Cost Basis"
          value={formatCurrency(stats.totalCostBasis)}
          sub={`${stats.totalItems} items · ${stats.totalQuantity} units`}
          icon={Package}
        />
        <StatCard
          title="Market Value"
          value={formatCurrency(stats.totalEstimatedValue)}
          icon={DollarSign}
        />
        <StatCard
          title="Unrealized P&L"
          value={formatCurrency(Math.abs(stats.unrealizedPnL))}
          variant="pnl"
          pnlValue={stats.unrealizedPnL}
          currency
          sub={`${stats.unrealizedPnLPct >= 0 ? '+' : ''}${stats.unrealizedPnLPct.toFixed(1)}% vs cost`}
          icon={stats.unrealizedPnL >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          title="Portfolio Return"
          value={`${Math.abs(stats.unrealizedPnLPct).toFixed(2)}%`}
          variant="pnl"
          pnlValue={stats.unrealizedPnL}
          icon={BarChart2}
        />
        <StatCard
          title="Realized (Month)"
          value={formatCurrency(Math.abs(stats.realizedPnLThisMonth))}
          variant="pnl"
          pnlValue={stats.realizedPnLThisMonth}
          currency
          sub={`${stats.soldItemsThisMonth} units sold`}
          icon={stats.realizedPnLThisMonth >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          title="Realized (All Time)"
          value={formatCurrency(Math.abs(stats.realizedPnLAllTime))}
          variant="pnl"
          pnlValue={stats.realizedPnLAllTime}
          currency
          icon={stats.realizedPnLAllTime >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          title="Active Listings"
          value={String(stats.totalItems)}
          icon={Layers}
        />
        <StatCard
          title="Total Units"
          value={String(stats.totalQuantity)}
          icon={Package}
        />
        <StatCard
          title="Sold This Month"
          value={String(stats.soldItemsThisMonth)}
          icon={ShoppingBag}
        />
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {(stats.itemsNeedingPriceRefresh > 0 || stats.itemsMissingImage > 0) && (
        <div className="flex gap-3 flex-wrap">
          {stats.itemsNeedingPriceRefresh > 0 && (
            <Link
              href="/pricing-review"
              className="flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-900/20 px-4 py-2 text-sm text-amber-300 hover:bg-amber-900/30 transition-colors"
            >
              <AlertCircle size={14} />
              {stats.itemsNeedingPriceRefresh} need price refresh
            </Link>
          )}
          {stats.itemsMissingImage > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-400">
              <ImageOff size={14} />
              {stats.itemsMissingImage} missing images
            </div>
          )}
        </div>
      )}

      {/* ── Unrealized movers ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <MoverSection title="Top Gainers" viewAllHref="/inventory">
          {topGainers.length ? (
            topGainers.map((m) => <ItemMoverRow key={m.id} item={m} />)
          ) : (
            <MoverEmpty />
          )}
        </MoverSection>
        <MoverSection title="Top Losers">
          {topLosers.length ? (
            topLosers.map((m) => <ItemMoverRow key={m.id} item={m} />)
          ) : (
            <MoverEmpty />
          )}
        </MoverSection>
      </div>

      {/* ── Realized movers ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <MoverSection title="Best Realized" viewAllHref="/transactions">
          {bestRealized.length ? (
            bestRealized.map((s) => <SellMoverRow key={s.transactionId} sell={s} />)
          ) : (
            <MoverEmpty />
          )}
        </MoverSection>
        <MoverSection title="Worst Realized">
          {worstRealized.length ? (
            worstRealized.map((s) => <SellMoverRow key={s.transactionId} sell={s} />)
          ) : (
            <MoverEmpty />
          )}
        </MoverSection>
      </div>

      {/* ── Holdings ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <MoverSection title="Most Valuable">
          {mostValuable.length ? (
            mostValuable.map((m) => (
              <ItemMoverRow key={m.id} item={m} showPnL={false} />
            ))
          ) : (
            <MoverEmpty />
          )}
        </MoverSection>
        <MoverSection title="Largest Positions">
          {largestPositions.length ? (
            largestPositions.map((m) => (
              <ItemMoverRow key={m.id} item={m} showPnL={false} showCostBasis />
            ))
          ) : (
            <MoverEmpty />
          )}
        </MoverSection>
      </div>

      {/* ── Attention + Recently Sold ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <NeedsAttentionSection items={needsAttention} />
        <MoverSection title="Recently Sold" viewAllHref="/transactions">
          {recentlySold.length ? (
            recentlySold.map((s) => <SellMoverRow key={s.transactionId} sell={s} />)
          ) : (
            <MoverEmpty />
          )}
        </MoverSection>
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <PortfolioCharts
        monthlyPnL={chartData.monthlyPnL}
        allocationByGame={chartData.allocationByGame}
      />
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}
