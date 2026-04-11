import { prisma } from '@/lib/prisma'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { Button } from '@/components/ui/button'
import { computeWeightedAvgCost, computeRealizedPnL } from '@/services/pnlService'
import Link from 'next/link'
import type { InventoryItemWithStats } from '@/types'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const raw = await prisma.inventoryItem.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      transactions: true,
      priceComps: { take: 1, orderBy: { fetchedAt: 'desc' } },
    },
  })

  const items: InventoryItemWithStats[] = raw.map((item) => {
    const buys = item.transactions.filter((t) => t.type === 'BUY')
    const sells = item.transactions.filter((t) => t.type === 'SELL')
    const weightedAvgCost = computeWeightedAvgCost(item, buys)
    const effectivePrice = item.priceOverride ?? item.latestMarketPrice
    const currentEstimatedValue = effectivePrice != null ? effectivePrice * item.quantity : null
    const remainingCostBasis = weightedAvgCost * item.quantity
    const unrealizedPnL = currentEstimatedValue != null ? currentEstimatedValue - remainingCostBasis : null
    const realizedPnL = computeRealizedPnL(sells)
    const totalCostBasis = buys.reduce((s, t) => s + Math.abs(t.netAmount), 0) || item.purchasePrice * item.quantity + item.fees + item.shippingCost

    return {
      ...item,
      totalCostBasis,
      weightedAvgCost,
      currentEstimatedValue,
      unrealizedPnL,
      realizedPnL,
      effectivePrice,
    }
  })

  const totalValue = items.reduce((s, i) => s + (i.currentEstimatedValue ?? 0), 0)
  const totalCost = items.reduce((s, i) => s + i.weightedAvgCost * i.quantity, 0)
  const totalPnL = totalValue - totalCost

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Inventory</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {items.filter((i) => i.quantity > 0).length} active · {items.filter((i) => i.quantity === 0).length} sold out
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Est. Portfolio</p>
            <p className="text-sm font-mono font-semibold text-zinc-100">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue)}
            </p>
          </div>
          <Link href="/inventory/new">
            <Button>+ Add Card</Button>
          </Link>
        </div>
      </div>

      <InventoryTable items={items} />
    </div>
  )
}
