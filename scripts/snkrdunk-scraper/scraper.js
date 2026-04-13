/**
 * SNKRDUNK Trading Card Price Scraper
 * ====================================
 * Uses Puppeteer to scrape SNKRDUNK (スニーカーダンク) for trading card sold prices.
 *
 * IMPORTANT — SNKRDUNK is a Japanese TCG marketplace:
 *  - Only Japanese Pokemon/TCG cards are listed (NO sports cards)
 *  - Search ONLY works with Japanese keywords (e.g. リザードン not "charizard")
 *  - Use --translate flag to auto-translate common English Pokemon names
 *
 * Strategy:
 *  1. Intercept internal API/fetch calls made by the Next.js page (most reliable)
 *  2. Fall back to DOM scraping if API interception yields nothing
 *  3. Saves results to SQLite (persistent, queryable) + optionally exports CSV
 *
 * Usage:
 *   node scraper.js "リザードン ex"          (Japanese query — direct)
 *   node scraper.js --query="charizard ex" --translate   (auto-translate EN→JA)
 *   node scraper.js --query="ピカチュウ" --limit=10 --csv
 *   node scraper.js --url="https://snkrdunk.com/products/XXXXX"
 *   node scraper.js --history --query="リザードン"    (query local DB only, no scrape)
 *   node scraper.js --export-csv                      (export entire DB to CSV)
 */

'use strict'

const puppeteer  = require('puppeteer')
const Database   = require('better-sqlite3')
const { createObjectCsvWriter } = require('csv-writer')
const path       = require('path')
const fs         = require('fs')

// ── Config ────────────────────────────────────────────────────────────────────

const DB_PATH  = path.join(__dirname, 'prices.db')
const CSV_DIR  = path.join(__dirname, 'exports')
const JPY_RATE = parseFloat(process.env.JPY_USD_RATE ?? '0.0067')   // ≈149 JPY/USD

const BASE_URL       = 'https://snkrdunk.com'
// English search works fine with Puppeteer — the site is internationalized.
// Static HTTP fetches returned wrong results because JS wasn't executed.
const SEARCH_URL     = `${BASE_URL}/search?keyword=`
const USER_AGENT     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ── Database setup ────────────────────────────────────────────────────────────

function openDb() {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS price_records (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      scraped_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      query         TEXT,
      product_id    TEXT,
      product_url   TEXT,
      name          TEXT    NOT NULL,
      name_ja       TEXT,
      min_price_jpy INTEGER,
      min_price_usd REAL,
      display_price TEXT,
      image_url     TEXT,
      condition     TEXT,
      listing_count INTEGER,
      source_page   TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_query      ON price_records(query);
    CREATE INDEX IF NOT EXISTS idx_product_id ON price_records(product_id);
    CREATE INDEX IF NOT EXISTS idx_scraped_at ON price_records(scraped_at);
  `)

  return db
}

const insertStmt = (db) => db.prepare(`
  INSERT INTO price_records
    (query, product_id, product_url, name, name_ja, min_price_jpy, min_price_usd, display_price, image_url, condition, listing_count, source_page)
  VALUES
    (@query, @product_id, @product_url, @name, @name_ja, @min_price_jpy, @min_price_usd, @display_price, @image_url, @condition, @listing_count, @source_page)
`)

// ── Price helpers ─────────────────────────────────────────────────────────────

function parseJpy(raw) {
  if (!raw) return null
  const cleaned = String(raw).replace(/[¥,￥\s]/g, '').match(/\d+/)
  return cleaned ? parseInt(cleaned[0], 10) : null
}

function jpyToUsd(jpy) {
  if (!jpy) return null
  return Math.round(jpy * JPY_RATE * 100) / 100
}

// ── Intercept API responses ───────────────────────────────────────────────────
// SNKRDUNK's Next.js frontend makes internal fetches to SSR endpoints and
// possibly a JSON API. We capture any response that looks like product data.

function looksLikeProductData(obj) {
  if (!obj || typeof obj !== 'object') return false
  if (Array.isArray(obj)) {
    return obj.length > 0 && obj[0] && ('name' in obj[0] || 'minPrice' in obj[0] || 'displayPrice' in obj[0])
  }
  // Could be wrapped: { products: [...] } or { items: [...] } etc.
  for (const key of ['products', 'items', 'results', 'data', 'hottestHobbies', 'usedHobbies', 'latestHobbies']) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) return true
  }
  return false
}

function extractProductsFromJson(json) {
  if (!json) return []
  if (Array.isArray(json)) return json
  for (const key of ['products', 'items', 'results', 'data', 'hottestHobbies', 'usedHobbies', 'latestHobbies']) {
    if (Array.isArray(json[key])) return json[key]
  }
  return []
}

function normalizeProduct(raw, query, sourcePage) {
  // Handle both camelCase and snake_case API responses
  const name     = raw.name ?? raw.productName ?? raw.localizedName ?? raw.title ?? ''
  const nameJa   = raw.localizedName ?? raw.nameJa ?? null
  const id       = raw.id ?? raw.productId ?? raw.slug ?? null
  const url      = raw.url ?? raw.productUrl ?? (id ? `${BASE_URL}/products/${id}` : null)
  const imageUrl = raw.primaryMedia?.imageUrl ?? raw.imageUrl ?? raw.image ?? raw.thumbnail ?? null

  // Price extraction — field names vary across SNKRDUNK API versions
  const rawPrice = raw.minPrice ?? raw.displayPrice ?? raw.price ?? raw.lowestPrice ?? raw.sellPrice
  const jpyPrice = typeof rawPrice === 'number' ? rawPrice : parseJpy(String(rawPrice ?? ''))
  const displayPrice = raw.displayPrice ?? (jpyPrice ? `¥${jpyPrice.toLocaleString()}` : null)

  const listingCount = raw.totalListingCount ?? raw.listingCount ?? raw.count ?? null
  const condition    = raw.condition ?? raw.itemCondition ?? null

  if (!name) return null

  return {
    query:         query ?? null,
    product_id:    id ? String(id) : null,
    product_url:   url,
    name,
    name_ja:       nameJa,
    min_price_jpy: jpyPrice,
    min_price_usd: jpyToUsd(jpyPrice),
    display_price: displayPrice,
    image_url:     imageUrl,
    condition,
    listing_count: listingCount,
    source_page:   sourcePage,
  }
}

// ── DOM scraping fallback ─────────────────────────────────────────────────────
// When API interception yields nothing, parse the rendered DOM directly.

async function scrapeProductsFromDom(page, query, sourcePage) {
  return page.evaluate((baseUrl, query, sourcePage) => {
    const results = []

    // SNKRDUNK uses various patterns — try multiple selector strategies
    const selectors = [
      // Product grid cards
      '[class*="ProductCard"]',
      '[class*="product-card"]',
      '[class*="ItemCard"]',
      '[class*="item-card"]',
      'li[class*="product"]',
      'article[class*="product"]',
      // Generic grid items
      '[data-product-id]',
      '[data-testid*="product"]',
    ]

    let cards = []
    for (const sel of selectors) {
      const found = Array.from(document.querySelectorAll(sel))
      if (found.length > 0) { cards = found; break }
    }

    // Last resort: any <a> with /products/ href that has a price nearby
    if (cards.length === 0) {
      const links = Array.from(document.querySelectorAll('a[href*="/products/"]'))
      cards = links.map((a) => a.closest('li, article, div[class]') ?? a).filter(Boolean)
    }

    for (const card of cards.slice(0, 20)) {
      // Name
      const nameEl = card.querySelector(
        '[class*="name"], [class*="title"], [class*="Name"], [class*="Title"], h2, h3, p[class*="label"]'
      )
      const name = nameEl?.textContent?.trim() ?? ''
      if (!name || name.length < 2) continue

      // Price — look for ¥ symbol
      const priceEls = Array.from(card.querySelectorAll('*')).filter(
        (el) => el.children.length === 0 && /[¥￥]/.test(el.textContent ?? '')
      )
      const priceText = priceEls[0]?.textContent?.trim() ?? ''
      const priceMatch = priceText.replace(/[,￥¥\s]/g, '').match(/\d+/)
      const jpyPrice = priceMatch ? parseInt(priceMatch[0], 10) : null

      // Product ID from link
      const linkEl = card.querySelector('a[href*="/products/"]') ?? (card.tagName === 'A' ? card : null)
      const href   = linkEl?.getAttribute('href') ?? ''
      const idMatch = href.match(/\/products\/([^/?#]+)/)
      const productId = idMatch?.[1] ?? null

      // Image
      const imgEl = card.querySelector('img')
      const imageUrl = imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? null

      results.push({
        query,
        product_id:    productId,
        product_url:   productId ? `${baseUrl}/products/${productId}` : null,
        name,
        name_ja:       null,
        min_price_jpy: jpyPrice,
        min_price_usd: jpyPrice ? Math.round(jpyPrice * 0.0067 * 100) / 100 : null,
        display_price: priceText || null,
        image_url:     imageUrl,
        condition:     null,
        listing_count: null,
        source_page:   sourcePage,
      })
    }

    return results
  }, baseUrl, query, sourcePage)
}

// ── Single product page ───────────────────────────────────────────────────────

async function scrapeProductPage(page, productUrl, query) {
  console.log(`  → Scraping product page: ${productUrl}`)

  const intercepted = []

  page.on('response', async (response) => {
    const url = response.url()
    const ct  = response.headers()['content-type'] ?? ''
    if (!ct.includes('json')) return
    // Capture any JSON response that might contain product data
    try {
      const json = await response.json()
      if (looksLikeProductData(json) || json?.name || json?.minPrice || json?.product) {
        intercepted.push(json)
      }
    } catch { /* ignore */ }
  })

  await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 })

  // Try to extract from intercepted API responses first
  for (const json of intercepted) {
    const raw = json?.product ?? json?.data ?? json
    if (raw?.name) {
      const product = normalizeProduct(raw, query, productUrl)
      if (product) return [product]
    }
  }

  // DOM fallback for product page
  return page.evaluate((baseUrl, query, productUrl) => {
    const results = []

    // Product detail page selectors
    const nameEl = document.querySelector(
      'h1, [class*="ProductName"], [class*="product-name"], [class*="Title"], [itemprop="name"]'
    )
    const name = nameEl?.textContent?.trim() ?? ''
    if (!name) return results

    // Price elements
    const priceEls = Array.from(document.querySelectorAll('*')).filter(
      (el) => el.children.length === 0 && /[¥￥][\d,]+/.test(el.textContent ?? '')
    )
    // Find the minimum/buy-now price (usually the smallest price on the page)
    const prices = priceEls
      .map((el) => {
        const m = el.textContent.replace(/[,￥¥\s]/g, '').match(/\d+/)
        return m ? parseInt(m[0], 10) : null
      })
      .filter((p) => p && p > 100)  // filter out tiny numbers that aren't prices

    const minPrice = prices.length > 0 ? Math.min(...prices) : null

    // Image
    const ogImg = document.querySelector('meta[property="og:image"]')
    const imageUrl = ogImg?.getAttribute('content') ?? document.querySelector('img[class*="product"]')?.src ?? null

    // Product ID from URL
    const idMatch = productUrl.match(/\/products\/([^/?#]+)/)
    const productId = idMatch?.[1] ?? null

    results.push({
      query,
      product_id:    productId,
      product_url:   productUrl,
      name,
      name_ja:       null,
      min_price_jpy: minPrice,
      min_price_usd: minPrice ? Math.round(minPrice * 0.0067 * 100) / 100 : null,
      display_price: minPrice ? `¥${minPrice.toLocaleString()}` : null,
      image_url:     imageUrl,
      condition:     null,
      listing_count: null,
      source_page:   productUrl,
    })
    return results
  }, baseUrl, query, productUrl)
}

// ── Search results page ───────────────────────────────────────────────────────

async function scrapeSearch(page, query, limit = 10) {
  const url = `${SEARCH_URL}${encodeURIComponent(query)}`
  console.log(`  → Loading: ${url}`)

  const interceptedProducts = []

  // Listen for JSON API responses before navigation
  const responseHandler = async (response) => {
    const ct = response.headers()['content-type'] ?? ''
    if (!ct.includes('json')) return
    try {
      const json = await response.json()
      if (looksLikeProductData(json)) {
        const items = extractProductsFromJson(json)
        interceptedProducts.push(...items)
      }
    } catch { /* ignore */ }
  }
  page.on('response', responseHandler)

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

  // Give extra time for client-side hydration
  await new Promise((r) => setTimeout(r, 2000))

  // Also try reading the __NEXT_DATA__ or globalThis.__ssp from the page context
  const embeddedProducts = await page.evaluate(() => {
    // Try Next.js page props
    try {
      const nextScript = document.getElementById('__NEXT_DATA__')
      if (nextScript) {
        const data = JSON.parse(nextScript.textContent)
        const walk = (obj, found = []) => {
          if (!obj || typeof obj !== 'object') return found
          if (Array.isArray(obj)) {
            if (obj.length > 0 && obj[0]?.minPrice !== undefined) found.push(...obj)
            else obj.forEach((v) => walk(v, found))
          } else {
            Object.values(obj).forEach((v) => walk(v, found))
          }
          return found
        }
        const found = walk(data)
        if (found.length > 0) return found
      }
    } catch { /* ignore */ }

    // Try globalThis.__ssp (SNKRDUNK specific)
    try {
      if (window.__ssp) {
        const ssp = window.__ssp
        return [
          ...(ssp.hottestHobbies ?? []),
          ...(ssp.usedHobbies ?? []),
          ...(ssp.latestHobbies ?? []),
          ...(ssp.products ?? []),
        ]
      }
    } catch { /* ignore */ }

    return []
  })

  page.off('response', responseHandler)

  // Combine and deduplicate sources
  const allRaw = [...interceptedProducts, ...embeddedProducts]
  let products = []

  if (allRaw.length > 0) {
    console.log(`  ✓ API interception: ${allRaw.length} raw items`)
    products = allRaw
      .map((raw) => normalizeProduct(raw, query, url))
      .filter(Boolean)
  }

  // DOM fallback
  if (products.length === 0) {
    console.log(`  → API interception empty — trying DOM scrape…`)
    products = await scrapeProductsFromDom(page, query, url)
    if (products.length > 0) console.log(`  ✓ DOM scrape: ${products.length} items`)
    else console.log(`  ✗ DOM scrape also found nothing`)
  }

  // Filter by query terms (loose match)
  if (query && products.length > 0) {
    const queryLower = query.toLowerCase()
    const terms = queryLower.split(/\s+/).filter((t) => t.length > 1)
    const scored = products.map((p) => {
      const nameLower = (p.name + ' ' + (p.name_ja ?? '')).toLowerCase()
      const matches = terms.filter((t) => nameLower.includes(t)).length
      return { ...p, _score: matches }
    })
    scored.sort((a, b) => b._score - a._score)
    products = scored.map(({ _score, ...rest }) => rest)  // strip _score
  }

  return products.slice(0, limit)
}

// ── CSV export ────────────────────────────────────────────────────────────────

async function exportToCsv(records, filename) {
  if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR, { recursive: true })
  const filepath = path.join(CSV_DIR, filename)

  const writer = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: 'id',            title: 'ID' },
      { id: 'scraped_at',    title: 'Scraped At' },
      { id: 'query',         title: 'Search Query' },
      { id: 'name',          title: 'Product Name' },
      { id: 'name_ja',       title: 'Product Name (JA)' },
      { id: 'min_price_jpy', title: 'Min Price (JPY)' },
      { id: 'min_price_usd', title: 'Min Price (USD)' },
      { id: 'display_price', title: 'Display Price' },
      { id: 'condition',     title: 'Condition' },
      { id: 'listing_count', title: 'Listing Count' },
      { id: 'product_id',    title: 'Product ID' },
      { id: 'product_url',   title: 'Product URL' },
      { id: 'image_url',     title: 'Image URL' },
    ],
  })

  await writer.writeRecords(records)
  return filepath
}

// ── Query local DB ────────────────────────────────────────────────────────────

function queryHistory(db, query) {
  return db.prepare(`
    SELECT id, scraped_at, name, min_price_jpy, min_price_usd, display_price, condition, listing_count, product_url
    FROM price_records
    WHERE lower(name) LIKE lower(?) OR lower(query) LIKE lower(?)
    ORDER BY scraped_at DESC
    LIMIT 50
  `).all(`%${query}%`, `%${query}%`)
}

// ── Print results ─────────────────────────────────────────────────────────────

function printResults(records, showUsd = true) {
  if (records.length === 0) {
    console.log('\n  No results found.\n')
    return
  }

  console.log('\n' + '─'.repeat(90))
  console.log(
    'Name'.padEnd(45),
    'JPY'.padStart(10),
    showUsd ? 'USD'.padStart(8) : '',
    'Listings'.padStart(9),
    'Condition'.padStart(12),
  )
  console.log('─'.repeat(90))

  for (const r of records) {
    const name     = (r.name ?? '').slice(0, 44).padEnd(45)
    const jpy      = r.min_price_jpy ? `¥${Number(r.min_price_jpy).toLocaleString()}`.padStart(10) : '—'.padStart(10)
    const usd      = showUsd ? (r.min_price_usd ? `$${r.min_price_usd.toFixed(2)}`.padStart(8) : '—'.padStart(8)) : ''
    const listings = r.listing_count != null ? String(r.listing_count).padStart(9) : '—'.padStart(9)
    const cond     = (r.condition ?? '').padStart(12)
    console.log(name, jpy, usd, listings, cond)
  }
  console.log('─'.repeat(90))
  console.log(`  ${records.length} result(s)\n`)
}

// ── CLI argument parsing ──────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    query:      null,
    url:        null,
    limit:      10,
    csv:        false,
    history:    false,
    exportAll:  false,
    headless:   true,
  }

  for (const arg of args) {
    if (arg.startsWith('--query='))    opts.query    = arg.split('=').slice(1).join('=')
    else if (arg.startsWith('--url=')) opts.url      = arg.split('=').slice(1).join('=')
    else if (arg.startsWith('--limit=')) opts.limit  = parseInt(arg.split('=')[1]) || 10
    else if (arg === '--csv')          opts.csv      = true
    else if (arg === '--history')      opts.history  = true
    else if (arg === '--export-csv')   opts.exportAll = true
    else if (arg === '--no-headless')  opts.headless = false
    // Positional: first non-flag arg is the query
    else if (!arg.startsWith('--') && !opts.query) opts.query = arg
  }

  return opts
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()
  const db   = openDb()
  const insert = insertStmt(db)

  // ── History-only mode (no scraping) ───────────────────────────────────────
  if (opts.history) {
    if (!opts.query) { console.error('--history requires --query=<term>'); process.exit(1) }
    console.log(`\nLocal DB results for "${opts.query}":`)
    const rows = queryHistory(db, opts.query)
    printResults(rows)
    db.close()
    return
  }

  // ── Export entire DB to CSV ────────────────────────────────────────────────
  if (opts.exportAll) {
    const rows = db.prepare('SELECT * FROM price_records ORDER BY scraped_at DESC').all()
    const filename = `snkrdunk-export-${new Date().toISOString().slice(0, 10)}.csv`
    const filepath = await exportToCsv(rows, filename)
    console.log(`\nExported ${rows.length} records → ${filepath}`)
    db.close()
    return
  }

  // ── Scrape mode ────────────────────────────────────────────────────────────
  if (!opts.query && !opts.url) {
    console.error([
      'SNKRDUNK Price Scraper',
      '',
      'Usage:',
      '  node scraper.js "charizard ex"',
      '  node scraper.js --query="pikachu" --limit=5 --csv',
      '  node scraper.js --url="https://snkrdunk.com/products/XXXXXX"',
      '  node scraper.js --history --query="charizard"   (local DB only)',
      '  node scraper.js --export-csv                    (dump DB to CSV)',
      '',
      'Options:',
      '  --limit=N       Max results (default 10)',
      '  --csv           Save this run to a dated CSV file',
      '  --no-headless   Show browser window (useful for debugging)',
    ].join('\n'))
    process.exit(1)
  }

  console.log('\nLaunching browser…')
  const browser = await puppeteer.launch({
    headless: opts.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 900 },
  })

  let products = []

  try {
    const page = await browser.newPage()

    // Spoof user-agent and hide automation
    await page.setUserAgent(USER_AGENT)
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    // Block heavy assets we don't need (fonts, tracking)
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const rt = req.resourceType()
      const url = req.url()
      if (
        rt === 'font' ||
        (rt === 'image' && !url.includes('snkrdunk.com')) ||
        url.includes('googletagmanager') ||
        url.includes('facebook') ||
        url.includes('analytics')
      ) {
        req.abort()
      } else {
        req.continue()
      }
    })

    if (opts.url) {
      // Direct product page scrape
      products = await scrapeProductPage(page, opts.url, opts.query ?? opts.url)
    } else {
      // Search
      console.log(`Searching SNKRDUNK for: "${opts.query}"`)
      products = await scrapeSearch(page, opts.query, opts.limit)
    }

  } finally {
    await browser.close()
  }

  // ── Save to DB ─────────────────────────────────────────────────────────────
  const saved = db.transaction((rows) => {
    let count = 0
    for (const row of rows) {
      try { insert.run(row); count++ } catch { /* ignore constraint errors */ }
    }
    return count
  })(products)

  // ── Display results ────────────────────────────────────────────────────────
  printResults(products)
  console.log(`Saved ${saved} record(s) to ${DB_PATH}`)

  // ── Optional CSV export of this run ───────────────────────────────────────
  if (opts.csv && products.length > 0) {
    const slug    = (opts.query ?? 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
    const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `${slug}-${ts}.csv`
    const filepath = await exportToCsv(products, filename)
    console.log(`CSV saved → ${filepath}`)
  }

  db.close()
}

main().catch((err) => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
