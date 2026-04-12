import type { InventoryItem, Transaction, PriceComp, CardCatalog } from '@prisma/client'

// ─── Re-exports ──────────────────────────────────────────────────────────────
export type { InventoryItem, Transaction, PriceComp, CardCatalog }

// ─── Enriched / view types ───────────────────────────────────────────────────
export type InventoryItemWithStats = InventoryItem & {
  transactions: Transaction[]
  priceComps: PriceComp[]
  totalCostBasis: number
  weightedAvgCost: number
  currentEstimatedValue: number | null
  unrealizedPnL: number | null
  realizedPnL: number
  effectivePrice: number | null  // priceOverride ?? latestMarketPrice
}

export type DashboardStats = {
  totalCostBasis: number
  totalEstimatedValue: number
  unrealizedPnL: number
  unrealizedPnLPct: number
  realizedPnLThisMonth: number
  realizedPnLAllTime: number
  totalItems: number
  totalQuantity: number
  soldItemsThisMonth: number
  itemsNeedingPriceRefresh: number
  itemsMissingImage: number
}

export type ItemMover = {
  id: string
  cardName: string
  setName: string | null
  imageUrl: string | null
  // shared
  category: string
  game: string
  language: string
  // sports
  sport: string | null
  league: string | null
  season: string | null
  manufacturer: string | null
  brand: string | null
  playerName: string | null
  teamName: string | null
  parallel: string | null
  autograph: boolean
  memorabilia: boolean
  rookie: boolean
  // condition
  gradingCompany: string | null
  grade: string | null
  conditionRaw: string | null
  // financials
  quantity: number
  effectivePrice: number | null
  currentEstimatedValue: number | null
  unrealizedPnL: number | null
  unrealizedPnLPct: number | null
  weightedAvgCost: number
  remainingCostBasis: number
  latestMarketCheckedAt: string | null
  priceOverride: number | null
  hasMissingImage: boolean
}

export type SellMover = {
  transactionId: string
  inventoryItemId: string
  cardName: string
  setName: string | null
  imageUrl: string | null
  realizedPnL: number
  realizedPnLPct: number | null
  unitPrice: number
  netAmount: number
  quantity: number
  transactionDate: string
  platform: string | null
}

export type NeedsAttentionItem = {
  id: string
  cardName: string
  setName: string | null
  imageUrl: string | null
  issues: string[]
}

export type DashboardData = {
  stats: DashboardStats
  allMovers: ItemMover[]
  allSells: SellMover[]
  needsAttention: NeedsAttentionItem[]
  chartData: {
    allocationByGame: { name: string; value: number; costBasis: number }[]
    monthlyPnL: { month: string; realized: number }[]
  }
}

// ─── Provider types ───────────────────────────────────────────────────────────
export type NormalizedComp = {
  title: string
  soldPrice: number
  soldDate: Date | null
  currency: string
  source: string
  url: string | null
  imageUrl: string | null
  conditionGuess: string | null
  gradeGuess: string | null
  /** 0–1 relevance score computed by the provider; not persisted to DB */
  confidenceScore?: number
}

export type PricingProviderResult = {
  comps: NormalizedComp[]
  suggestedPrice: number | null
  source: string
  fetchedAt: Date
  error: string | null
}

export type ImageProviderResult = {
  url: string | null
  source: string
  cached: boolean
}

// ─── Form types ───────────────────────────────────────────────────────────────
export type AddInventoryInput = {
  // ── Shared identity ──────────────────────────────────────────────────────
  category?: string
  game: string
  cardName: string
  setName?: string
  cardNumber?: string
  language: string
  rarity?: string
  variant?: string
  // ── Condition / grading ──────────────────────────────────────────────────
  conditionRaw?: string
  gradingCompany?: string
  grade?: string
  certNumber?: string
  // ── Sports-specific ───────────────────────────────────────────────────────
  sport?: string
  league?: string
  season?: string
  manufacturer?: string
  brand?: string
  productLine?: string
  subsetName?: string
  insertName?: string
  parallel?: string
  serialNumbered?: boolean
  serialNumber?: string
  autograph?: boolean
  memorabilia?: boolean
  rookie?: boolean
  playerName?: string
  teamName?: string
  year?: number
  // ── Acquisition ──────────────────────────────────────────────────────────
  quantity: number
  purchasePrice: number
  purchaseDate: string
  fees: number
  shippingCost: number
  source?: string
  notes?: string
  imageUrl?: string
  manualImageUrl?: string
}

export type SellInput = {
  inventoryItemId: string
  quantitySold: number
  soldUnitPrice: number
  fees: number
  shippingCost: number
  tax: number
  platform?: string
  transactionDate: string
  note?: string
}

export type SellPreview = {
  grossSale: number
  totalFees: number
  netProceeds: number
  costBasisSold: number
  realizedPnL: number
  remainingQuantity: number
}

// ─── API response types ───────────────────────────────────────────────────────
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
