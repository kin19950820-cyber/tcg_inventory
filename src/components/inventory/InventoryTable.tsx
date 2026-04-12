'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SellModal } from './SellModal'
import { formatCurrency, formatDate, pnlColor, pnlSign } from '@/lib/utils'
import type { InventoryItemWithStats } from '@/types'
import { RefreshCw, ExternalLink } from 'lucide-react'

interface Props {
  items: InventoryItemWithStats[]
  onRefresh?: () => void
}

export function InventoryTable({ items, onRefresh }: Props) {
  const router = useRouter()
  const [sellItem, setSellItem] = useState<InventoryItemWithStats | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const handleRefreshPrice = async (itemId: string) => {
    setRefreshing(itemId)
    try {
      await fetch('/api/pricing/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      router.refresh()
    } finally {
      setRefreshing(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-sm">No inventory yet.</p>
        <Link href="/inventory/new" className="text-brand-400 text-sm mt-2 inline-block hover:underline">
          Add your first card →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-10"></th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Card</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Condition</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cost/Unit</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Market</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Unreal. P&L</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Real. P&L</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Purchased</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id} className="group hover:bg-zinc-800/40 transition-colors">
                {/* Thumbnail */}
                <td className="px-4 py-2.5">
                  {item.imageUrl ? (
                    <div className="w-8 h-11 relative flex-shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.cardName}
                        fill
                        className="object-contain rounded"
                        sizes="32px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-11 rounded bg-zinc-800 border border-zinc-700" />
                  )}
                </td>

                {/* Card info */}
                <td className="px-4 py-2.5 max-w-[260px]">
                  <Link href={`/inventory/${item.id}`} className="group/link">
                    <p className="font-medium text-zinc-100 group-hover/link:text-brand-400 truncate flex items-center gap-1">
                      {item.category === 'SPORTS' && item.playerName ? item.playerName : item.cardName}
                      <ExternalLink size={11} className="opacity-0 group-hover/link:opacity-100 text-zinc-500" />
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {item.category === 'SPORTS'
                        ? [item.setName, item.cardNumber && `#${item.cardNumber}`, item.parallel].filter(Boolean).join(' · ')
                        : [item.setName, item.cardNumber && `#${item.cardNumber}`, item.variant].filter(Boolean).join(' · ')
                      }
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {item.category === 'SPORTS' && (
                        <Badge variant="info" className="text-xs">{item.league ?? item.game}</Badge>
                      )}
                      {item.rookie && <Badge variant="warning" className="text-xs">RC</Badge>}
                      {item.autograph && <Badge variant="purple" className="text-xs">AUTO</Badge>}
                      {item.memorabilia && <Badge variant="info" className="text-xs">PATCH</Badge>}
                      {item.serialNumber && (
                        <span className="text-xs text-zinc-500">{item.serialNumber}</span>
                      )}
                      {item.category === 'TCG' && item.game !== 'pokemon' && (
                        <Badge variant="default" className="text-xs">{item.game}</Badge>
                      )}
                    </div>
                  </Link>
                </td>

                {/* Condition */}
                <td className="px-4 py-2.5">
                  {item.gradingCompany && item.grade ? (
                    <Badge variant="purple">{item.gradingCompany} {item.grade}</Badge>
                  ) : item.conditionRaw ? (
                    <Badge variant={item.conditionRaw === 'NM' || item.conditionRaw === 'M' ? 'success' : 'warning'}>
                      {item.conditionRaw}
                    </Badge>
                  ) : (
                    <span className="text-zinc-600 text-xs">—</span>
                  )}
                </td>

                {/* Qty */}
                <td className="px-4 py-2.5 text-right font-mono text-zinc-200">
                  {item.quantity}
                </td>

                {/* Cost/Unit */}
                <td className="px-4 py-2.5 text-right font-mono text-zinc-300">
                  {formatCurrency(item.weightedAvgCost)}
                </td>

                {/* Market price */}
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {item.priceOverride && (
                      <span className="text-xs text-amber-500" title="Manual override">★</span>
                    )}
                    <span className="font-mono text-zinc-200">
                      {formatCurrency(item.effectivePrice)}
                    </span>
                    <button
                      onClick={() => handleRefreshPrice(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-zinc-300"
                      title="Refresh price"
                    >
                      <RefreshCw size={12} className={refreshing === item.id ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  {item.latestMarketCheckedAt && (
                    <p className="text-xs text-zinc-600">{formatDate(item.latestMarketCheckedAt)}</p>
                  )}
                </td>

                {/* Unrealized P&L */}
                <td className={`px-4 py-2.5 text-right font-mono ${pnlColor(item.unrealizedPnL)}`}>
                  {item.unrealizedPnL != null
                    ? `${pnlSign(item.unrealizedPnL)}${formatCurrency(item.unrealizedPnL)}`
                    : '—'}
                </td>

                {/* Realized P&L */}
                <td className={`px-4 py-2.5 text-right font-mono ${pnlColor(item.realizedPnL)}`}>
                  {item.realizedPnL !== 0
                    ? `${pnlSign(item.realizedPnL)}${formatCurrency(item.realizedPnL)}`
                    : '—'}
                </td>

                {/* Purchase date */}
                <td className="px-4 py-2.5 text-right text-xs text-zinc-500">
                  {formatDate(item.purchaseDate)}
                </td>

                {/* Actions */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    {item.quantity > 0 && (
                      <Button size="xs" variant="secondary" onClick={() => setSellItem(item)}>
                        Sell
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sellItem && (
        <SellModal
          item={sellItem}
          open={!!sellItem}
          onClose={() => setSellItem(null)}
          onSuccess={() => { setSellItem(null); router.refresh(); onRefresh?.() }}
        />
      )}
    </>
  )
}
