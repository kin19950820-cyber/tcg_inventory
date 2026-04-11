# Architecture & Component Reference

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend Layer                    │
│  (Pages, Components, Client/Server Components)              │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
       ┌─────▼─────────────────────────────┐  ┌──▼──────────┐
       │     API Routes (/api/*)           │  │  Services   │
       │ • /inventory                      │  │  & Utilities│
       │ • /transactions                   │  │             │
       │ • /dashboard                      │  └──────────────┘
       │ • /catalog/search                 │
       │ • /pricing/refresh                │
       └─────┬──────────────────────────────┘
             │
       ┌─────▼──────────────────────────────┐
       │    Prisma ORM Layer                 │
       │ • InventoryItem                    │
       │ • Transaction                      │
       │ • PriceComp                        │
       │ • CardCatalog                      │
       └─────┬──────────────────────────────┘
             │
       ┌─────▼──────────────────────────────┐
       │    SQLite Database                  │
       │    (dev.db)                        │
       └────────────────────────────────────┘
```

## Component Tree

```
AppLayout (wrapper)
├── Sidebar
│   └── Navigation links
└── Main Content
    ├── Dashboard
    │   ├── StatCard (multiple)
    │   └── RecentCards
    ├── Inventory
    │   ├── InventoryTable
    │   │   └── Individual rows (sellable)
    │   └── Add Inventory
    │       ├── CardSearchInput → fuzzy search
    │       └── AddInventoryForm
    │           └── SellModal (for selling items)
    ├── Transactions
    │   └── Transaction list/details
    └── Pricing Review
        └── Manual price adjustment UI
```

## Data Model Relationships

```
InventoryItem (1) ──────────────┬───────────── (Many) Transaction
                                │
                                ├───────────── (Many) PriceComp
                                │
                                └── Composed from CardCatalog search

CardCatalog
└── Normalization for searching
```

## Key Feature Flows

### Flow 1: Add Card to Inventory
```
/inventory/new (Page)
    ↓
CardSearchInput → cardSearchService → CardCatalog search
    ↓ (select card)
AddInventoryForm (auto-fills game, name, set, image)
    ↓ (user fills price, date, quantity)
POST /api/inventory
    ↓
prisma.inventoryItem.create()
    ↓ (success)
/inventory (redirect)
    ↓
InventoryTable displays updated item
```

### Flow 2: View Collection Value
```
/dashboard (Page)
    ↓
GET /api/dashboard
    ↓
Calculate totals:
  - Sum all items: quantity × latestMarketPrice
  - Sum all costs: purchasePrice × quantity + fees
  - Sum all realized P&L from transactions
    ↓
Return StatCard data
    ↓
Dashboard renders metrics
```

### Flow 3: Sell Card
```
InventoryTable (card row)
    ↓
Click "Sell" → SellButtonClient
    ↓
SellModal opens
    ↓ (enter quantity, price)
POST /api/transactions {type: "SELL", ...}
    ↓
prisma.transaction.create()
    ↓
Calculate realizedPnL = (soldPrice - originalPrice) × qty
    ↓ (optionally update inventory quantity)
Success toast
```

### Flow 4: Refresh Market Prices
```
/api/pricing/refresh (POST route)
    ↓
For each InventoryItem:
  - pricingService calls providers
    - priceChartingProvider.fetch()
    - ebaySoldScraperProvider.fetch()
    - manualPriceProvider.getOverride()
    ↓
  - Aggregate results
  - Update latestMarketPrice in DB
    ↓
Return updated prices
```

## Service & Provider Details

### cardSearchService
```typescript
// Fuzzy search across CardCatalog.normalizedSearchText
Input: search query
Process: 
  - Fuse.js searches normalized fields
  - Returns top matches with relevance scores
Output: CardCatalog[]
```

### imageService
Attempts image fetching in order:
1. **manualImageProvider** - User-uploaded/set custom
2. **psaImageProvider** - Fetch from PSA if graded
3. **fallbackImageProvider** - Placeholder

### pricingService
Fetches from multiple sources, returns best price:
1. **priceChartingProvider** - Official pricing service
2. **ebaySoldScraperProvider** - Recent eBay sales
3. **manualPriceProvider** - User override

### pnlService
Calculates collection metrics:
- **Total Value** = Σ(quantity × latestPrice)
- **Cost Basis** = Σ(quantity × purchasePrice + fees + shipping)
- **Unrealized P&L** = Total Value - Cost Basis
- **Realized P&L** = Σ(realizedPnL from SELL transactions)

## State Management Pattern

### Server Components (Default)
- Pages query database directly
- `/dashboard` page → GET data → render

### Client Components (Selected)
- Forms: `AddInventoryForm`, `SellModal` (need interactivity)
- Tables: `InventoryTable` (filtering, sorting on client)
- Inputs: `CardSearchInput` (search debouncing on client)

### Data Fetching
- Pages use `await` for server-side data
- Forms use `fetch()` in event handlers
- Search uses debounced fetch with memoization

## Error Handling Patterns

```typescript
// API Routes typically return:
{ 
  ok: true,
  data: {...}  // or null
}

// Errors:
{
  ok: false,
  error: "Human readable message"
}

// Components check response.ok before proceeding
```

## Database Query Patterns

### Common Queries (in routes or pages)

```typescript
// Get all inventory with stats
const items = await prisma.inventoryItem.findMany({
  include: { transactions: true, priceComps: true }
})

// Get one item with related data
const item = await prisma.inventoryItem.findUnique({
  where: { id },
  include: { transactions: true, priceComps: true }
})

// Search catalog
const results = await prisma.cardCatalog.findMany({
  where: { normalizedSearchText: { contains: query } }
})

// Get transactions for an item
const txns = await prisma.transaction.findMany({
  where: { inventoryItemId: id },
  orderBy: { transactionDate: 'desc' }
})
```

## Validation Approach

- **Frontend**: React onChange handlers validate input types
- **API Routes**: Type-check request body before DB operations
- **Database**: Prisma schema enforces types (SQLite only supports basic validation)

Future: Implement Zod for stricter validation

---

*Reference: DEVELOPMENT.md for more details*
