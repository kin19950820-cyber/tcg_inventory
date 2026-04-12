# SNKRDUNK Price Scraper

Puppeteer-based scraper for SNKRDUNK (スニーカーダンク) trading card prices.

## Setup

```bash
cd scripts/snkrdunk-scraper
npm install
```

Puppeteer will download Chromium automatically (~200 MB on first install).

---

## Usage

### Search for a card

```bash
node scraper.js "charizard ex"
node scraper.js --query="pikachu 151" --limit=5
node scraper.js --query="wemby prizm silver rc" --csv
```

### Scrape a specific product page

```bash
node scraper.js --url="https://snkrdunk.com/products/XXXXXXX"
```

### Query local DB (no scraping)

```bash
node scraper.js --history --query="charizard"
```

### Export entire DB to CSV

```bash
node scraper.js --export-csv
```

### Debug (show browser window)

```bash
node scraper.js "charizard" --no-headless
```

---

## Options

| Flag | Description |
|------|-------------|
| `--query=<text>` | Search term (or pass as first positional arg) |
| `--url=<url>` | Scrape a specific product page directly |
| `--limit=N` | Max results to return (default: 10) |
| `--csv` | Save this run's results to `exports/` as a CSV |
| `--history` | Query local SQLite DB only (no browser launch) |
| `--export-csv` | Export entire database to a dated CSV file |
| `--no-headless` | Show browser window (useful for debugging SNKRDUNK layout changes) |

---

## Storage

- **SQLite database**: `prices.db` — all scraped results, queryable locally
- **CSV exports**: `exports/` — per-run or full-export CSV files

### DB schema

```sql
price_records (
  id            INTEGER PRIMARY KEY,
  scraped_at    TEXT,       -- ISO datetime
  query         TEXT,       -- search term used
  product_id    TEXT,       -- SNKRDUNK product code
  product_url   TEXT,
  name          TEXT,       -- product name (EN or JA)
  name_ja       TEXT,
  min_price_jpy INTEGER,    -- minimum listing price in JPY
  min_price_usd REAL,       -- converted to USD
  display_price TEXT,       -- e.g. "¥12,800"
  image_url     TEXT,
  condition     TEXT,
  listing_count INTEGER,
  source_page   TEXT
)
```

---

## Integration with the Next.js app

The `query-price.js` script is called by the `snkrdunkProvider` in the main app:

```
src/providers/pricing/snkrdunkProvider.ts
  → execFileSync('node', ['scripts/snkrdunk-scraper/query-price.js', '--query=...'])
```

The scraper returns JSON on stdout:
```json
{
  "source": "live",
  "data": {
    "name": "ポケモンカード リザードン",
    "min_price_jpy": 12800,
    "min_price_usd": 85.76,
    "display_price": "¥12,800",
    "product_url": "https://snkrdunk.com/products/XXXXX",
    "image_url": "https://...",
    "condition": null,
    "listing_count": 42
  }
}
```

### Cache TTL

Results are cached in `prices.db` for **60 minutes** before re-scraping.
Override: `SNKRDUNK_CACHE_TTL=30` (minutes).

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JPY_USD_RATE` | `0.0067` | JPY → USD conversion rate |
| `SNKRDUNK_SCRAPER_PATH` | auto | Absolute path to `query-price.js` |
| `SNKRDUNK_CACHE_TTL` | `60` | Cache TTL in minutes |

---

## How it works

SNKRDUNK is a Next.js App Router site that loads products via React Server Components
and client-side hydration — static HTML fetches return no product data.

The scraper uses **three strategies** in priority order:

1. **Network interception** — Puppeteer intercepts every JSON API response the page
   makes during load and extracts product data from them. This is the most reliable
   method since it captures the raw data before rendering.

2. **Embedded Next.js data** — After load, reads `window.__NEXT_DATA__` and
   `window.__ssp` from the page context for any product arrays.

3. **DOM scraping** — Falls back to querying rendered DOM elements using class-name
   patterns for product cards, prices (¥ symbol), and image tags.
