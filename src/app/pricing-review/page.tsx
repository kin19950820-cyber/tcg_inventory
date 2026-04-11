'use client'
import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRelativeDate, pnlColor } from '@/lib/utils'
import { RefreshCw, AlertCircle } from 'lucide-react'
import type { InventoryItem } from '@prisma/client'

type ItemWithAge = InventoryItem & { daysStale: number }

export default function PricingReviewPage() {
  const [items, setItems] = useState<ItemWithAge[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [refreshingAll, startRefreshAll] = useTransition()

  const fetchItems = async () => {
    setLoading(true)
    const res = await fetch('/api/inventory?limit=200')
    const json = await res.json()
    const now = Date.now()
    const enriched: ItemWithAge[] = (json.items as InventoryItem[])
      .filter((i) => i.quantity > 0)
      .map((i) => ({
        ...i,
        daysStale: i.latestMarketCheckedAt
          ? Math.floor((now - new Date(i.latestMarketCheckedAt).getTime()) / 86400000)
          : 999,
      }))
      .sort((a, b) => b.daysStale - a.daysStale)
    setItems(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const refreshOne = async (id: string) => {
    setRefreshingId(id)
    await fetch('/api/pricing/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id }),
    })
    setRefreshingId(null)
    fetchItems()
  }

  const refreshAll = () => {
    startRefreshAll(async () => {
      await fetch('/api/pricing/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      fetchItems()
    })
  }

  const staleItems = items.filter((i) => i.daysStale >= 3)
  const freshItems = items.filter((i) => i.daysStale < 3)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Price Review</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {staleItems.length} need refresh · {freshItems.length} up to date
          </p>
        </div>
        <Button onClick={refreshAll} loading={refreshingAll} variant="secondary">
          <RefreshCw size={14} /> Refresh All
        </Button>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider w-10"></th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Card</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Market</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Cost/Unit</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Last Checked</th>
                <th className="px-4 py-3 w-24"></th>
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
                        <div className="relative w-8 h-11">
                          <Image src={item.imageUrl} alt={item.cardName} fill className="object-contain rounded" sizes="32px" unoptimized />
                        </div>
                      ) : <div className="w-8 h-11 rounded bg-zinc-800" />}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/inventory/${item.id}`} className="font-medium text-zinc-200 hover:text-brand-400 truncate block max-w-[200px]">
                        {item.cardName}
                      </Link>
                      <p className="text-xs text-zinc-500 truncate">{item.setName}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-mono text-zinc-200">{formatCurrency(item.latestMarketPrice)}</span>
                      {margin != null && (
                        <span className={`ml-2 text-xs ${pnlColor(margin)}`}>
                          {margin >= 0 ? '+' : ''}{margin.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-400">
                      {formatCurrency(item.purchasePrice)}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.latestMarketSource ? (
                        <Badge variant={item.priceOverride ? 'warning' : 'default'}>
                          {item.priceOverride ? '★ manual' : item.latestMarketSource}
                        </Badge>
                      ) : <span className="text-zinc-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {item.daysStale >= 3 && <AlertCircle size={13} className="text-amber-500" />}
                        <span className={`text-xs ${item.daysStale >= 7 ? 'text-red-400' : item.daysStale >= 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {item.latestMarketCheckedAt ? formatRelativeDate(item.latestMarketCheckedAt) : 'Never'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        loading={refreshingId === item.id}
                        onClick={() => refreshOne(item.id)}
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
