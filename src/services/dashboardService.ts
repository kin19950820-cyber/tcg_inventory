import { prisma } from '@/lib/prisma'
import { computeWeightedAvgCost } from './pnlService'
import type {
  DashboardData,
  DashboardStats,
  ItemMover,
  SellMover,
  NeedsAttentionItem,
} from '@/types'

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000)

  const [allItems, allSellTxns] = await Promise.all([
    prisma.inventoryItem.findMany({ include: { transactions: true } }),
    prisma.transaction.findMany({
      where: { type: 'SELL' },
      include: {
        inventoryItem: { select: { cardName: true, setName: true, imageUrl: true } },
      },
      orderBy: { transactionDate: 'desc' },
    }),
  ])

  // Build itemId → item map for sell lookups
  const itemMap = new Map(allItems.map((i) => [i.id, i]))

  // ── Active item movers ─────────────────────────────────────────────────────
  const allMovers: ItemMover[] = allItems
    .filter((i) => i.quantity > 0)
    .map((item) => {
      const buys = item.transactions.filter((t) => t.type === 'BUY')
      const weightedAvgCost = computeWeightedAvgCost(item, buys)
      const remainingCostBasis = weightedAvgCost * item.quantity
      const effectivePrice = item.priceOverride ?? item.latestMarketPrice
      const currentEstimatedValue =
        effectivePrice != null ? effectivePrice * item.quantity : null
      const unrealizedPnL =
        currentEstimatedValue != null
          ? currentEstimatedValue - remainingCostBasis
          : null
      const unrealizedPnLPct =
        unrealizedPnL != null && remainingCostBasis > 0
          ? (unrealizedPnL / remainingCostBasis) * 100
          : null

      return {
        id: item.id,
        cardName: item.cardName,
        setName: item.setName,
        imageUrl: item.imageUrl ?? item.manualImageUrl ?? null,
        category: item.category,
        game: item.game,
        language: item.language,
        sport: item.sport,
        league: item.league,
        season: item.season,
        manufacturer: item.manufacturer,
        brand: item.brand,
        playerName: item.playerName,
        teamName: item.teamName,
        parallel: item.parallel,
        autograph: item.autograph,
        memorabilia: item.memorabilia,
        rookie: item.rookie,
        gradingCompany: item.gradingCompany,
        grade: item.grade,
        conditionRaw: item.conditionRaw,
        quantity: item.quantity,
        effectivePrice,
        currentEstimatedValue,
        unrealizedPnL,
        unrealizedPnLPct,
        weightedAvgCost,
        remainingCostBasis,
        latestMarketCheckedAt: item.latestMarketCheckedAt?.toISOString() ?? null,
        priceOverride: item.priceOverride,
        hasMissingImage: !item.imageUrl && !item.manualImageUrl,
      }
    })

  // ── Aggregate stats ────────────────────────────────────────────────────────
  let totalCostBasis = 0
  let totalEstimatedValue = 0
  let unrealizedPnL = 0
  let totalQuantity = 0
  let itemsNeedingPriceRefresh = 0
  let itemsMissingImage = 0

  for (const m of allMovers) {
    totalCostBasis += m.remainingCostBasis
    totalQuantity += m.quantity
    if (m.currentEstimatedValue != null) totalEstimatedValue += m.currentEstimatedValue
    if (m.unrealizedPnL != null) unrealizedPnL += m.unrealizedPnL
    if (
      !m.latestMarketCheckedAt ||
      new Date(m.latestMarketCheckedAt) < threeDaysAgo
    ) {
      itemsNeedingPriceRefresh++
    }
    if (m.hasMissingImage) itemsMissingImage++
  }

  const unrealizedPnLPct =
    totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0
  const realizedPnLAllTime = allSellTxns.reduce(
    (s, t) => s + (t.realizedPnL ?? 0),
    0,
  )
  const thisMonthSells = allSellTxns.filter((t) => t.transactionDate >= startOfMonth)
  const realizedPnLThisMonth = thisMonthSells.reduce(
    (s, t) => s + (t.realizedPnL ?? 0),
    0,
  )
  const soldItemsThisMonth = thisMonthSells.reduce((s, t) => s + t.quantity, 0)

  const stats: DashboardStats = {
    totalCostBasis,
    totalEstimatedValue,
    unrealizedPnL,
    unrealizedPnLPct,
    realizedPnLThisMonth,
    realizedPnLAllTime,
    totalItems: allMovers.length,
    totalQuantity,
    soldItemsThisMonth,
    itemsNeedingPriceRefresh,
    itemsMissingImage,
  }

  // ── Sell movers ────────────────────────────────────────────────────────────
  const allSells: SellMover[] = allSellTxns.map((t) => {
    const item = itemMap.get(t.inventoryItemId)
    const buys = item?.transactions.filter((x) => x.type === 'BUY') ?? []
    const wac = item ? computeWeightedAvgCost(item, buys) : 0
    const costBasisSold = wac * t.quantity
    const realizedPnLPct =
      costBasisSold > 0 ? ((t.realizedPnL ?? 0) / costBasisSold) * 100 : null

    return {
      transactionId: t.id,
      inventoryItemId: t.inventoryItemId,
      cardName: t.inventoryItem.cardName,
      setName: t.inventoryItem.setName,
      imageUrl: t.inventoryItem.imageUrl,
      realizedPnL: t.realizedPnL ?? 0,
      realizedPnLPct,
      unitPrice: t.unitPrice,
      netAmount: t.netAmount,
      quantity: t.quantity,
      transactionDate: t.transactionDate.toISOString(),
      platform: t.platform,
    }
  })

  // ── Needs attention ────────────────────────────────────────────────────────
  const needsAttention: NeedsAttentionItem[] = allMovers
    .map((m) => ({ m, issues: getIssues(m, threeDaysAgo) }))
    .filter(({ issues }) => issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length)
    .slice(0, 20)
    .map(({ m, issues }) => ({
      id: m.id,
      cardName: m.cardName,
      setName: m.setName,
      imageUrl: m.imageUrl,
      issues,
    }))

  // ── Chart data ─────────────────────────────────────────────────────────────
  // Allocation by game (cost basis)
  const gameMap = new Map<string, { value: number; costBasis: number }>()
  for (const m of allMovers) {
    const e = gameMap.get(m.game) ?? { value: 0, costBasis: 0 }
    gameMap.set(m.game, {
      value: e.value + (m.currentEstimatedValue ?? 0),
      costBasis: e.costBasis + m.remainingCostBasis,
    })
  }
  const allocationByGame = Array.from(gameMap.entries())
    .map(([name, { value, costBasis }]) => ({ name, value, costBasis }))
    .sort((a, b) => b.costBasis - a.costBasis)

  // Monthly realized P&L (last 12 months)
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)
  twelveMonthsAgo.setHours(0, 0, 0, 0)

  const monthlyMap = new Map<string, number>()
  for (const t of allSellTxns) {
    if (t.transactionDate < twelveMonthsAgo) continue
    const key = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (t.realizedPnL ?? 0))
  }

  const monthlyPnL: { month: string; realized: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyPnL.push({ month: key, realized: monthlyMap.get(key) ?? 0 })
  }

  return {
    stats,
    allMovers,
    allSells,
    needsAttention,
    chartData: { allocationByGame, monthlyPnL },
  }
}

function getIssues(m: ItemMover, threeDaysAgo: Date): string[] {
  const issues: string[] = []
  if (m.effectivePrice == null) issues.push('No price')
  if (m.hasMissingImage) issues.push('No image')
  if (m.priceOverride != null) issues.push('Manual price')
  else if (
    !m.latestMarketCheckedAt ||
    new Date(m.latestMarketCheckedAt) < threeDaysAgo
  ) {
    issues.push('Stale price')
  }
  return issues
}
