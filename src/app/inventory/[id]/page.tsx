import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getInventoryItemWithStats } from '@/services/pnlService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, pnlColor, pnlSign } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { SellButtonClient } from './SellButtonClient'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function InventoryDetailPage({ params }: Props) {
  const { id } = await params
  let item

  try {
    item = await getInventoryItemWithStats(id)
  } catch {
    notFound()
  }

  const sells = item.transactions.filter((t) => t.type === 'SELL')

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <Link href="/inventory" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft size={14} /> Back to Inventory
      </Link>

      {/* Top section */}
      <div className="grid grid-cols-[180px_1fr] gap-6">
        {/* Card image */}
        <div className="flex flex-col gap-3">
          <div className="relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.cardName} fill className="object-contain p-2" sizes="180px" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs text-center px-4">
                No image
              </div>
            )}
          </div>
          {item.quantity > 0 && <SellButtonClient item={item} />}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-100">
                {item.category === 'SPORTS' && item.playerName ? item.playerName : item.cardName}
              </h1>
              {item.gradingCompany && item.grade && (
                <Badge variant="purple" className="text-sm px-2.5 py-1">{item.gradingCompany} {item.grade}</Badge>
              )}
              {!item.gradingCompany && item.conditionRaw && (
                <Badge variant={item.conditionRaw === 'NM' ? 'success' : 'warning'}>{item.conditionRaw}</Badge>
              )}
              {item.rookie && <Badge variant="warning">RC</Badge>}
              {item.autograph && <Badge variant="purple">AUTO</Badge>}
              {item.memorabilia && <Badge variant="info">PATCH</Badge>}
              {item.serialNumber && <Badge variant="default">{item.serialNumber}</Badge>}
            </div>
            <p className="text-zinc-400 mt-1">
              {item.category === 'SPORTS'
                ? [item.setName, item.cardNumber && `#${item.cardNumber}`, item.parallel, item.insertName].filter(Boolean).join(' · ')
                : [item.setName, item.cardNumber && `#${item.cardNumber}`, item.variant].filter(Boolean).join(' · ')
              }
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {item.category === 'SPORTS'
                ? [item.teamName, item.league, item.sport].filter(Boolean).join(' · ')
                : `${item.language} · ${item.game}`
              }
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Quantity" value={String(item.quantity)} />
            <Stat label="Avg Cost/Unit" value={formatCurrency(item.weightedAvgCost)} mono />
            <Stat label="Total Cost Basis" value={formatCurrency(item.totalCostBasis)} mono />
            <Stat label="Market Price" value={formatCurrency(item.effectivePrice)} mono
              sub={item.priceOverride ? '★ manual override' : item.latestMarketSource ?? undefined} />
            <Stat label="Est. Value" value={formatCurrency(item.currentEstimatedValue)} mono />
            <Stat
              label="Unrealized P&L"
              value={item.unrealizedPnL != null ? `${pnlSign(item.unrealizedPnL)}${formatCurrency(item.unrealizedPnL)}` : '—'}
              mono
              valueClass={pnlColor(item.unrealizedPnL)}
            />
          </div>

          {/* Sports metadata */}
          {item.category === 'SPORTS' && (
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-sm grid grid-cols-2 gap-2">
              {item.playerName && <Info label="Player" value={item.playerName} />}
              {item.teamName && <Info label="Team" value={item.teamName} />}
              {item.season && <Info label="Season" value={item.season} />}
              {item.manufacturer && <Info label="Manufacturer" value={item.manufacturer} />}
              {item.brand && <Info label="Brand" value={item.brand} />}
              {item.productLine && <Info label="Product" value={item.productLine} />}
              {item.parallel && <Info label="Parallel" value={item.parallel} />}
              {item.insertName && <Info label="Insert" value={item.insertName} />}
              {item.serialNumber && <Info label="Serial #" value={item.serialNumber} />}
              {item.league && <Info label="League" value={item.league} />}
            </div>
          )}

          {/* Purchase info */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-sm grid grid-cols-2 gap-2">
            <Info label="Source" value={item.source ?? '—'} />
            <Info label="Purchased" value={formatDate(item.purchaseDate)} />
            <Info label="Purchase Price" value={formatCurrency(item.purchasePrice)} />
            <Info label="Fees + Shipping" value={formatCurrency(item.fees + item.shippingCost)} />
            {item.certNumber && <Info label="Cert #" value={item.certNumber} />}
            {item.notes && <div className="col-span-2"><Info label="Notes" value={item.notes} /></div>}
          </div>
        </div>
      </div>

      {/* Price comps */}
      {item.priceComps.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Latest Price Comps</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500">Title</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Price</th>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500">Condition</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {item.priceComps.map((comp) => (
                  <tr key={comp.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5 text-zinc-300 max-w-xs truncate">{comp.title}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-200">{formatCurrency(comp.soldPrice)}</td>
                    <td className="px-4 py-2.5 text-zinc-500 text-xs">{comp.conditionGuess ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-500 text-xs">{formatDate(comp.soldDate)}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <Badge variant="default">{comp.source}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Transaction history */}
      {item.transactions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Transaction History</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500">Type</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Qty</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Unit Price</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Net</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500">P&L</th>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500">Platform</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {item.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5">
                      <Badge variant={t.type === 'BUY' ? 'info' : t.type === 'SELL' ? 'success' : 'default'}>
                        {t.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-300 font-mono">{t.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-300">{formatCurrency(t.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-300">{formatCurrency(Math.abs(t.netAmount))}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${pnlColor(t.realizedPnL)}`}>
                      {t.realizedPnL != null ? `${pnlSign(t.realizedPnL)}${formatCurrency(t.realizedPnL)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 text-xs">{t.platform ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-500 text-xs">{formatDate(t.transactionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, mono, sub, valueClass }: {
  label: string; value: string; mono?: boolean; sub?: string; valueClass?: string
}) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-sm font-semibold text-zinc-100 ${mono ? 'font-mono' : ''} ${valueClass ?? ''}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-zinc-500">{label}: </span>
      <span className="text-zinc-300">{value}</span>
    </div>
  )
}
