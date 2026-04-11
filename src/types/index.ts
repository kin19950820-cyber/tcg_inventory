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
  realizedPnLThisMonth: number
  totalItems: number
  itemsNeedingPriceRefresh: number
  itemsMissingImage: number
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
  game: string
  cardName: string
  setName?: string
  cardNumber?: string
  language: string
  rarity?: string
  variant?: string
  conditionRaw?: string
  gradingCompany?: string
  grade?: string
  certNumber?: string
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
