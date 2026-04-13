'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { RefreshCw, AlertCircle } from 'lucide-react'
import type { InventoryItem } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRelativeDate, pnlColor } from '@/lib/utils'

type ItemWithAge = InventoryItem & { daysStale: number }

export default function PricingReviewPage() {
  const [items, setItems] = useState<ItemWithAge[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/inventory?limit=200', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load inventory (${res.status})`)

      const json = await res.json()
      const now = Date.now()

      const enriched: ItemWithAge[] = (json.items as InventoryItem[])
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          ...item,
          daysStale: item.latestMarketCheckedAt
            ? Math.floor((now - new Date(item.latestMarketCheckedAt).getTime()) / 86400000)
            : 999,
        }))
        .sort((a, b) => b.daysStale - a.daysStale)

      setItems(enriched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pricing review items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchItems()
  }, [])

  const refreshOne = async (id: string) => {
    setRefreshingId(id)
    setError(null)

    try {
      const res = await fetch('/api/pricing/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Failed to refresh item (${res.status})`)
      }

      await fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh item price')
    } finally {
      setRefreshingId(null)
    }
  }

  const refreshAll = async () => {
    setRefreshingAll(true)
    setError(null)

    try {
      const res = await fetch('/api/pricing/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Failed to refresh prices (${res.status})`)
      }

      await fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh all prices')
    } finally {
      setRefreshingAll(false)
    }
  }

  const staleItems = items.filter((item) => item.daysStale >= 3)
  const freshItems = items.filter((item) => item.daysStale < 3)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Price Review</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {staleItems.length} need refresh | {freshItems.length} up to date
          </p>
        </div>

        <Button onClick={refreshAll} loading={refreshingAll} variant="secondary" disabled={loading}>
          <RefreshCw size={14} /> Refresh All
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-zinc-500">Loading...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="w-10 px-4 py-3 text-left text-xs uppercase tracking-wider text-zinc-500"></th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-zinc-500">Card</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-zinc-500">Market</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-zinc-500">Cost/Unit</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-zinc-500">Source</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-zinc-500">Last Checked</th>
                <th className="w-24 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {items.map((item) => {
                const margin = item.latestMarketPrice != null
                  ? ((item.latestMarketPrice - item.purchasePrice) / item.purchasePrice) * 100
                  : null

                return (
                  <tr key={item.id} className="group hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5">
                      {item.imageUrl ? (
                        <div className="relative h-11 w-8">
                          <Image
                            src={item.imageUrl}
                            alt={item.cardName}
                            fill
                            className="rounded object-contain"
                            sizes="32px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-11 w-8 rounded bg-zinc-800" />
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="block max-w-[200px] truncate font-medium text-zinc-200 hover:text-brand-400"
                      >
                        {item.cardName}
                      </Link>
                      <p className="truncate text-xs text-zinc-500">{item.setName}</p>
                    </td>

                    <td className="px-4 py-2.5 text-right">
                      <span className="font-mono text-zinc-200">{formatCurrency(item.latestMarketPrice)}</span>
                      {margin != null && (
                        <span className={`ml-2 text-xs ${pnlColor(margin)}`}>
                          {margin >= 0 ? '+' : ''}
                          {margin.toFixed(0)}%
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-right font-mono text-zinc-400">
                      {formatCurrency(item.purchasePrice)}
                    </td>

                    <td className="px-4 py-2.5">
                      {item.latestMarketSource ? (
                        <Badge variant={item.priceOverride ? 'warning' : 'default'}>
                          {item.priceOverride ? '* manual' : item.latestMarketSource}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-600">-</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {item.daysStale >= 3 && <AlertCircle size={13} className="text-amber-500" />}
                        <span
                          className={`text-xs ${
                            item.daysStale >= 7 ? 'text-red-400' : item.daysStale >= 3 ? 'text-amber-400' : 'text-zinc-500'
                          }`}
                        >
                          {item.latestMarketCheckedAt ? formatRelativeDate(item.latestMarketCheckedAt) : 'Never'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        loading={refreshingId === item.id}
                        onClick={() => void refreshOne(item.id)}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <RefreshCw size={12} /> Refresh
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
