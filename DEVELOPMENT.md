# TCG Inventory Management System - Development Guide

## Project Overview
A Next.js web application for managing a Trading Card Game (TCG) inventory with pricing, profit/loss tracking, and sales management. Built with TypeScript, Prisma ORM, SQLite, and Tailwind CSS.

**Status**: MVP Phase - Core features implemented, database initialized
**Git Config**: user.name=Sam.L, user.email=kin19950820@gmail.com

---

## Quick Start
```bash
npm install           # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with sample data
npm run build        # Production build
npm start            # Production server
```

---

## Project Structure

### `/src/app/` - Next.js App Router
```
app/
├── page.tsx                    # Home page
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles
├── dashboard/page.tsx          # Dashboard (main stats view)
├── inventory/
│   ├── page.tsx               # Inventory list
│   ├── [id]/page.tsx          # Individual item details
│   ├── [id]/SellButtonClient.tsx  # Sell modal trigger
│   └── new/page.tsx           # Add new inventory form
├── transactions/page.tsx       # Transaction history
├── pricing-review/page.tsx     # Manual price review
└── api/
    ├── inventory/route.ts           # GET/POST inventory items
    ├── inventory/[id]/route.ts      # GET/PUT inventory item
    ├── transactions/route.ts        # GET/POST transactions
    ├── dashboard/route.ts           # GET dashboard stats
    ├── catalog/search/route.ts      # GET card catalog search
    └── pricing/refresh/route.ts     # POST refresh prices
```

### `/src/components/` - React Components
```
components/
├── dashboard/
│   ├── RecentCards.tsx         # Recent activity cards
│   └── StatCard.tsx            # Statistics card
├── inventory/
│   ├── AddInventoryForm.tsx     # Form to add new cards
│   ├── CardSearchInput.tsx      # Search catalog input
│   ├── InventoryTable.tsx       # Display inventory list
│   └── SellModal.tsx            # Sell card modal
├── layout/
│   ├── AppLayout.tsx            # Main app wrapper
│   └── Sidebar.tsx              # Navigation sidebar
└── ui/
    ├── badge.tsx, button.tsx, card.tsx  # UI primitives
    ├── dialog.tsx, input.tsx, select.tsx
```

### `/src/services/` - Business Logic
- **cardSearchService.ts** - Fuzzy search cards in catalog
- **imageService.ts** - Fetch/manage card images (PSA, manual, fallback)
- **pricingService.ts** - Fetch pricing from multiple providers
- **pnlService.ts** - Calculate profit/loss metrics

### `/src/providers/` - External Data Sources
**Image Providers:**
- psaImageProvider.ts - PSA grading company images
- manualImageProvider.ts - User-uploaded images
- fallbackImageProvider.ts - Placeholder images

**Pricing Providers:**
- priceChartingProvider.ts - Price Charting API
- ebaySoldScraperProvider.ts - eBay sold listings
- manualPriceProvider.ts - User-set prices

### `/prisma/` - Database
- **schema.prisma** - Database models & relationships
- **seed.ts** - Sample data initialization

---

## Database Schema

### Models
1. **InventoryItem** - Trading cards in inventory
   - Core: id, game, cardName, quantity
   - Pricing: purchasePrice, fees, shippingCost, latestMarketPrice
   - Grading: gradingCompany, grade, certNumber
   - Images: imageUrl, manualImageUrl
   - Metadata: variant, rarity, language, notes

2. **Transaction** - Buy/sell/adjustment records
   - Links: inventoryItemId (FK to InventoryItem)
   - Data: type (BUY/SELL/ADJUSTMENT), quantity, unitPrice
   - Fees: fees, shippingCost, tax
   - P&L: netAmount, realizedPnL

3. **PriceComp** - Price comparison data from scraping
   - Links: inventoryItemId (FK to InventoryItem)
   - Data: title, soldPrice, soldDate, source, url

4. **CardCatalog** - Searchable card database
   - Data: game, cardName, setName, cardNumber, language
   - Search: normalizedSearchText (for fuzzy search)

---

## Key API Routes

### Inventory Management
- `GET /api/inventory` - List all inventory items (paginated)
- `POST /api/inventory` - Add new card to inventory
- `GET /api/inventory/[id]` - Get single item details
- `PUT /api/inventory/[id]` - Update item (price, notes, etc.)

### Catalog Search
- `GET /api/catalog/search?q=search_term` - Fuzzy search cards

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Record buy/sell/adjustment

### Dashboard
- `GET /api/dashboard` - Get summary stats (total value, PnL, etc.)

### Pricing
- `POST /api/pricing/refresh` - Refresh market prices for all items

---

## Data Flow & Features

### Adding a Card
1. User goes to `/inventory/new`
2. Searches catalog using fuzzy search (`CardSearchInput` → `/api/catalog/search`)
3. Selects card (auto-populates fields)
4. Fills optional fields (purchase price, date, notes)
5. Submits form → `POST /api/inventory`
6. Database stores + redirects to `/inventory`

### Pricing System
- **Manual Price Override** - User can set custom price
- **Automatic Market Price** - Fetched from providers (Price Charting, eBay)
- **Price History** - Tracked via PriceComp model
- **P&L Calculation** - Based on purchase cost vs. latest market price

### Dashboard Metrics
- **Total Inventory Value** - Sum of (quantity × latest price)
- **Total Cost Basis** - Sum of purchases + fees
- **Unrealized P&L** - Market value - Cost basis
- **Realized P&L** - From completed sales

---

## Input Requirements for Adding Cards

### Required Fields
- **Card Name** - Name of the card
- **Purchase Price** - Cost per card (non-negative)

### Auto-Filled from Catalog (can override)
- **Game** - Pokemon, MTG, Yu-Gi-Oh!, etc. (default: Pokemon)
- **Language** - EN, JA, KO, etc. (default: EN)
- **Condition** - M, NM, LP, MP, HP, DMG (default: NM)
- **Quantity** - Number of copies (default: 1)

### Optional Fields
- Set Name, Card Number, Rarity, Variant
- Grading: Company (PSA/BGS/CGC/SGC), Grade, Cert Number
- Costs: Fees, Shipping Cost
- Details: Source, Notes, Image URL

---

## Development Notes

### Current Implementation Status
✅ Core CRUD operations for inventory
✅ Database schema & Prisma setup
✅ Fuzzy search across catalog
✅ Basic dashboard with stats
✅ UI components (forms, tables, modals)
✅ Git configured & initial commit pushed

### Known Limitations
⚠️ Pricing providers partially integrated (structure in place)
⚠️ Image providers structure in place (needs API keys)
⚠️ Email/notifications not implemented
⚠️ Authentication/user accounts not implemented
⚠️ Batch operations not implemented

### Next Steps / TODOs
- [ ] Implement actual pricing provider API calls
- [ ] Add image fetching from PSA/manual upload
- [ ] Complete sell transaction workflow
- [ ] Add authentication (multiple users)
- [ ] Implement batch edit/delete operations
- [ ] Add export functionality (CSV/PDF)
- [ ] Set up mobile-responsive design improvements
- [ ] Add data validation enhancements
- [ ] Error handling & logging improvements

---

## File Dependencies Reference

### Component Chain
`AddInventoryForm.tsx` 
  → calls `cardSearchService.ts` 
  → queries `CardCatalog` model

`InventoryTable.tsx` 
  → calls `/api/inventory` 
  → queries `InventoryItem` model

`Dashboard/page.tsx` 
  → calls `/api/dashboard` 
  → processes `InventoryItem` & `Transaction` models

### Service Chain
- `pricingService.ts` → calls all pricing providers → updates `InventoryItem.latestMarketPrice`
- `imageService.ts` → calls image providers → returns URL
- `pnlService.ts` → queries `InventoryItem` & `Transaction` → calculates metrics

---

## Important Environment Variables
```env
DATABASE_URL=file:./dev.db          # SQLite database (local dev)
```

Check `.env.example` for full list.

---

## Tech Stack Summary
- **Framework**: Next.js 15.1.0
- **Language**: TypeScript 5.7
- **Database**: SQLite + Prisma ORM
- **UI**: React 19 + Tailwind CSS 3.4
- **Search**: Fuse.js (fuzzy search)
- **Styling**: Tailwind + clsx
- **Forms**: React hooks + Zod validation
- **Icons**: Lucide React

---

## Performance Considerations
- Inventory list uses pagination (reduce query size)
- Fuzzy search uses indexed fields
- Dashboard aggregations could benefit from materialized views (future)
- Image lazy loading recommended for large lists

---

## Testing & Quality
- ESLint configured
- TypeScript strict mode active
- No unit tests yet (recommended for services layer)

---

*Last Updated: April 12, 2026*
*Developer: Sam.L (kin19950820@gmail.com)*
