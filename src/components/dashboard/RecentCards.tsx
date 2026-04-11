import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency, formatRelativeDate, pnlColor, pnlSign } from '@/lib/utils'
import type { InventoryItem, Transaction } from '@prisma/client'

type SellWithItem = Transaction & {
  inventoryItem: { cardName: string; setName: string | null; imageUrl: string | null }
}

export function RecentlyAdded({ items }: { items: InventoryItem[] }) {
  if (!items.length) return null
  return (
    <div className="rounded-xl border border-zinc-800 bg-surface-50 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Recently Added</p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/inventory/${item.id}`} className="flex items-center gap-3 group">
              {item.imageUrl ? (
                <div className="relative w-8 h-11 flex-shrink-0">
                  <Image src={item.imageUrl} alt={item.cardName} fill className="object-contain rounded" sizes="32px" unoptimized />
                </div>
              ) : (
                <div className="w-8 h-11 rounded bg-zinc-800 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-brand-400">{item.cardName}</p>
                <p className="text-xs text-zinc-500 truncate">{item.setName} · {formatRelativeDate(item.createdAt)}</p>
              </div>
              <span className="ml-auto text-sm font-mono text-zinc-400 flex-shrink-0">
                {formatCurrency(item.purchasePrice)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RecentlySold({ sells }: { sells: SellWithItem[] }) {
  if (!sells.length) return null
  return (
    <div className="rounded-xl border border-zinc-800 bg-surface-50 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Recently Sold</p>
      <ul className="space-y-3">
        {sells.map((t) => (
          <li key={t.id} className="flex items-center gap-3">
            {t.inventoryItem.imageUrl ? (
              <div className="relative w-8 h-11 flex-shrink-0">
                <Image src={t.inventoryItem.imageUrl} alt={t.inventoryItem.cardName} fill className="object-contain rounded" sizes="32px" unoptimized />
              </div>
            ) : (
              <div className="w-8 h-11 rounded bg-zinc-800 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{t.inventoryItem.cardName}</p>
              <p className="text-xs text-zinc-500">{t.platform ?? 'Unknown'} · {formatRelativeDate(t.transactionDate)}</p>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-sm font-mono text-zinc-300">{formatCurrency(t.netAmount)}</p>
              {t.realizedPnL != null && (
                <p className={`text-xs font-mono ${pnlColor(t.realizedPnL)}`}>
                  {pnlSign(t.realizedPnL)}{formatCurrency(t.realizedPnL)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
