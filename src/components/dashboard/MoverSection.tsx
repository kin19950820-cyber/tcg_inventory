import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency, pnlColor, pnlSign, formatRelativeDate } from '@/lib/utils'
import type { ItemMover, SellMover } from '@/types'

// ── Section shell ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  viewAllHref?: string
  children: React.ReactNode
}

export function MoverSection({ title, viewAllHref, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-surface-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="divide-y divide-zinc-800/50 flex-1">{children}</div>
    </div>
  )
}

export function MoverEmpty() {
  return (
    <p className="px-4 py-6 text-center text-xs text-zinc-600">No data</p>
  )
}

// ── Item mover row ─────────────────────────────────────────────────────────────

interface ItemMoverRowProps {
  item: ItemMover
  showPnL?: boolean
  showCostBasis?: boolean
}

export function ItemMoverRow({
  item,
  showPnL = true,
  showCostBasis = false,
}: ItemMoverRowProps) {
  const primaryValue = showCostBasis
    ? formatCurrency(item.remainingCostBasis)
    : item.currentEstimatedValue != null
      ? formatCurrency(item.currentEstimatedValue)
      : '—'

  return (
    <Link
      href={`/inventory/${item.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors group"
    >
      <Thumb src={item.imageUrl} alt={item.cardName} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-brand-400 truncate">
          {item.cardName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.gradingCompany && item.grade ? (
            <span className="text-xs text-purple-400">
              {item.gradingCompany} {item.grade}
            </span>
          ) : item.conditionRaw ? (
            <span className="text-xs text-zinc-500">{item.conditionRaw}</span>
          ) : null}
          <span className="text-xs text-zinc-600">{item.game}</span>
          {item.quantity > 1 && (
            <span className="text-xs text-zinc-700">×{item.quantity}</span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono text-zinc-200">{primaryValue}</p>
        {showPnL && item.unrealizedPnL != null && (
          <p className={`text-xs font-mono ${pnlColor(item.unrealizedPnL)}`}>
            {pnlSign(item.unrealizedPnL)}
            {formatCurrency(Math.abs(item.unrealizedPnL))}
            {item.unrealizedPnLPct != null && (
              <span className="ml-1 opacity-60">
                ({item.unrealizedPnLPct >= 0 ? '+' : ''}
                {item.unrealizedPnLPct.toFixed(0)}%)
              </span>
            )}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Sell mover row ────────────────────────────────────────────────────────────

export function SellMoverRow({ sell }: { sell: SellMover }) {
  return (
    <Link
      href={`/inventory/${sell.inventoryItemId}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors group"
    >
      <Thumb src={sell.imageUrl} alt={sell.cardName} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-brand-400 truncate">
          {sell.cardName}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {sell.platform ?? 'Unknown'} · {formatRelativeDate(new Date(sell.transactionDate))}
          {sell.quantity > 1 && ` · ×${sell.quantity}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono text-zinc-300">{formatCurrency(sell.netAmount)}</p>
        <p className={`text-xs font-mono ${pnlColor(sell.realizedPnL)}`}>
          {pnlSign(sell.realizedPnL)}
          {formatCurrency(Math.abs(sell.realizedPnL))}
          {sell.realizedPnLPct != null && (
            <span className="ml-1 opacity-60">
              ({sell.realizedPnLPct >= 0 ? '+' : ''}
              {sell.realizedPnLPct.toFixed(0)}%)
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}

// ── Shared thumbnail ──────────────────────────────────────────────────────────

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <div className="relative w-7 h-10 flex-shrink-0">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain rounded"
        sizes="28px"
        unoptimized
      />
    </div>
  ) : (
    <div className="w-7 h-10 rounded bg-zinc-800 flex-shrink-0" />
  )
}
