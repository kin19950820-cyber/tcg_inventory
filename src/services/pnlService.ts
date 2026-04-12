import { prisma } from '@/lib/prisma'
import type { InventoryItem, Transaction } from '@prisma/client'
import type { InventoryItemWithStats, SellInput, SellPreview, DashboardStats } from '@/types'

// ─── P&L calculation helpers ──────────────────────────────────────────────────

export function computeTotalCostBasis(item: InventoryItem, buyTransactions: Transaction[]): number {
  // Total cost = purchase price * qty + fees + shipping (all BUY transactions)
  if (buyTransactions.length > 0) {
    return buyTransactions.reduce((sum, t) => sum + Math.abs(t.netAmount), 0)
  }
  return item.purchasePrice * item.quantity + item.fees + item.shippingCost
}

export function computeWeightedAvgCost(item: InventoryItem, buyTransactions: Transaction[]): number {
  const totalQtyBought = buyTransactions.reduce((s, t) => s + t.quantity, 0) || item.quantity
  const totalCost = buyTransactions.reduce((s, t) => s + Math.abs(t.netAmount), 0)
    || (item.purchasePrice * item.quantity + item.fees + item.shippingCost)

  if (totalQtyBought === 0) return 0
  return totalCost / totalQtyBought
}

export function computeRealizedPnL(sellTransactions: Transaction[]): number {
  return sellTransactions.reduce((sum, t) => sum + (t.realizedPnL ?? 0), 0)
}

export function computeSellPreview(
  item: InventoryItem,
  input: Omit<SellInput, 'inventoryItemId' | 'transactionDate'>,
  weightedAvgCost: number
): SellPreview {
  const grossSale = input.soldUnitPrice * input.quantitySold
  const totalFees = input.fees + input.shippingCost + input.tax
  const netProceeds = grossSale - totalFees
  const costBasisSold = weightedAvgCost * input.quantitySold
  const realizedPnL = netProceeds - costBasisSold
  const remainingQuantity = item.quantity - input.quantitySold

  return { grossSale, totalFees, netProceeds, costBasisSold, realizedPnL, remainingQuantity }
}

// ─── Enriched item builder ────────────────────────────────────────────────────

export async function getInventoryItemWithStats(itemId: string): Promise<InventoryItemWithStats> {
  const item = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { transactions: true, priceComps: { orderBy: { fetchedAt: 'desc' } } },
  })

  const buys = item.transactions.filter((t) => t.type === 'BUY')
  const sells = item.transactions.filter((t) => t.type === 'SELL')

  const totalCostBasis = computeTotalCostBasis(item, buys)
  const weightedAvgCost = computeWeightedAvgCost(item, buys)
  const effectivePrice = item.priceOverride ?? item.latestMarketPrice
  const currentEstimatedValue = effectivePrice != null ? effectivePrice * item.quantity : null
  const remainingCostBasis = weightedAvgCost * item.quantity
  const unrealizedPnL = currentEstimatedValue != null ? currentEstimatedValue - remainingCostBasis : null
  const realizedPnL = computeRealizedPnL(sells)

  return {
    ...item,
    totalCostBasis,
    weightedAvgCost,
    currentEstimatedValue,
    unrealizedPnL,
    realizedPnL,
    effectivePrice,
  }
}

// ─── Sell execution ───────────────────────────────────────────────────────────

export async function executeSell(input: SellInput): Promise<Transaction> {
  const item = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: input.inventoryItemId },
    include: { transactions: true },
  })

  if (input.quantitySold > item.quantity) {
    throw new Error(`Cannot sell ${input.quantitySold} — only ${item.quantity} in stock`)
  }

  const buys = item.transactions.filter((t) => t.type === 'BUY')
  const weightedAvgCost = computeWeightedAvgCost(item, buys)
  const preview = computeSellPreview(item, input, weightedAvgCost)

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        inventoryItemId: input.inventoryItemId,
        type: 'SELL',
        quantity: input.quantitySold,
        unitPrice: input.soldUnitPrice,
        fees: input.fees,
        shippingCost: input.shippingCost,
        tax: input.tax,
        netAmount: preview.netProceeds,
        realizedPnL: preview.realizedPnL,
        transactionDate: new Date(input.transactionDate),
        platform: input.platform ?? null,
        note: input.note ?? null,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: input.inventoryItemId },
      data: { quantity: preview.remainingQuantity },
    }),
  ])

  return transaction
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

/** @deprecated Use getDashboardData() from dashboardService instead */
export async function getDashboardStats(): Promise<DashboardStats> {
  const items = await prisma.inventoryItem.findMany({
    include: { transactions: true },
  })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let totalCostBasis = 0
  let totalEstimatedValue = 0
  let unrealizedPnL = 0
  let totalQuantity = 0
  let itemsNeedingPriceRefresh = 0
  let itemsMissingImage = 0

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000)

  for (const item of items) {
    if (item.quantity <= 0) continue

    const buys = item.transactions.filter((t) => t.type === 'BUY')
    const weightedAvgCost = computeWeightedAvgCost(item, buys)
    const cost = weightedAvgCost * item.quantity
    totalCostBasis += cost
    totalQuantity += item.quantity

    const effectivePrice = item.priceOverride ?? item.latestMarketPrice
    if (effectivePrice != null) {
      const estValue = effectivePrice * item.quantity
      totalEstimatedValue += estValue
      unrealizedPnL += estValue - cost
    }

    if (!item.latestMarketCheckedAt || item.latestMarketCheckedAt < threeDaysAgo) {
      itemsNeedingPriceRefresh++
    }

    if (!item.imageUrl && !item.manualImageUrl) {
      itemsMissingImage++
    }
  }

  const allSells = await prisma.transaction.findMany({ where: { type: 'SELL' } })
  const thisMonthSells = allSells.filter((t) => t.transactionDate >= startOfMonth)
  const realizedPnLThisMonth = thisMonthSells.reduce((s, t) => s + (t.realizedPnL ?? 0), 0)
  const realizedPnLAllTime = allSells.reduce((s, t) => s + (t.realizedPnL ?? 0), 0)
  const soldItemsThisMonth = thisMonthSells.reduce((s, t) => s + t.quantity, 0)
  const unrealizedPnLPct = totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0

  return {
    totalCostBasis,
    totalEstimatedValue,
    unrealizedPnL,
    unrealizedPnLPct,
    realizedPnLThisMonth,
    realizedPnLAllTime,
    totalItems: items.filter((i) => i.quantity > 0).length,
    totalQuantity,
    soldItemsThisMonth,
    itemsNeedingPriceRefresh,
    itemsMissingImage,
  }
}
