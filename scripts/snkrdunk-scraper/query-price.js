/**
 * Real-time price lookup — called by the Next.js pricing API via child_process.
 *
 * Returns a single JSON object (stdout) with the best matching price.
 * Exit code 0 = success, 1 = no results, 2 = error.
 *
 * Usage (from Next.js):
 *   const { execFileSync } = require('child_process')
 *   const result = JSON.parse(execFileSync('node', [
 *     path.join(SCRAPER_DIR, 'query-price.js'),
 *     '--query=charizard ex sv3pt5',
 *   ]))
 *
 * Or standalone:
 *   node query-price.js "charizard ex"
 *   node query-price.js --query="wemby prizm silver rc" --top=3
 */

'use strict'

const puppeteer = require('puppeteer')
const Database  = require('better-sqlite3')
const path      = require('path')

const DB_PATH  = path.join(__dirname, 'prices.db')
const JPY_RATE = parseFloat(process.env.JPY_USD_RATE ?? '0.0067')
const BASE_URL = 'https://snkrdunk.com'
const SEARCH_URL = `${BASE_URL}/apparel-categories/25?department_name=hobby`
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Max age for a cached DB result before we re-scrape (in minutes)
const CACHE_TTL_MINUTES = 60

function parseArgs() {
  const args = process.argv.slice(2)
  let query = null
  let top   = 1
  for (const arg of args) {
    if (arg.startsWith('--query='))    query = arg.split('=').slice(1).join('=')
    else if (arg.startsWith('--top=')) top   = parseInt(arg.split('=')[1]) || 1
    else if (!arg.startsWith('--'))    query = arg
  }
  return { query, top }
}

function parseJpy(raw) {
  if (!raw) return null
  const m = String(raw).replace(/[¥,￥\s]/g, '').match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

function jpyToUsd(jpy) {
  return jpy ? Math.round(jpy * JPY_RATE * 100) / 100 : null
}

function normalizeProduct(raw, query, sourcePage) {
  const name     = raw.name ?? raw.productName ?? raw.localizedName ?? raw.title ?? ''
  const nameJa   = raw.localizedName ?? null
  const id       = raw.id ?? raw.productId ?? raw.slug ?? null
  const url      = raw.url ?? (id ? `${BASE_URL}/products/${id}` : null)
  const imageUrl = raw.primaryMedia?.imageUrl ?? raw.imageUrl ?? null

  const rawPrice = raw.minPrice ?? raw.displayPrice ?? raw.price ?? raw.lowestPrice
  const jpyPrice = typeof rawPrice === 'number' ? rawPrice : parseJpy(String(rawPrice ?? ''))

  if (!name) return null
  return {
    query,
    product_id:    id ? String(id) : null,
    product_url:   url,
    name,
    name_ja:       nameJa,
    min_price_jpy: jpyPrice,
    min_price_usd: jpyToUsd(jpyPrice),
    display_price: jpyPrice ? `¥${jpyPrice.toLocaleString()}` : null,
    image_url:     imageUrl,
    condition:     raw.condition ?? null,
    listing_count: raw.totalListingCount ?? null,
    source_page:   sourcePage,
  }
}

// Check local cache first
function checkCache(db, query) {
  const cutoff = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000).toISOString()
  const rows = db.prepare(`
    SELECT * FROM price_records
    WHERE lower(query) LIKE lower(?)
      AND scraped_at >= ?
      AND min_price_jpy IS NOT NULL
    ORDER BY scraped_at DESC
    LIMIT 5
  `).all(`%${query}%`, cutoff)
  return rows
}

async function fetchFromSnkrdunk(query, top) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1280, height: 900 },
  })

  const products = []

  try {
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    // Block unnecessary resources
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const rt = req.resourceType()
      const u  = req.url()
      if (rt === 'font' || rt === 'media' ||
          u.includes('googletagmanager') || u.includes('facebook') || u.includes('analytics')) {
        req.abort()
      } else {
        req.continue()
      }
    })

    const intercepted = []
    const responseHandler = async (response) => {
      const ct = response.headers()['content-type'] ?? ''
      if (!ct.includes('json')) return
      try {
        const json = await response.json()
        // Detect arrays of products or wrapped responses
        const candidates = [json, json?.products, json?.items, json?.results, json?.data,
          json?.hottestHobbies, json?.usedHobbies, json?.latestHobbies].flat().filter(Boolean)
        for (const c of candidates) {
          if (c && typeof c === 'object' && !Array.isArray(c) && (c.name || c.minPrice)) {
            intercepted.push(c)
          }
        }
      } catch { /* ignore */ }
    }
    page.on('response', responseHandler)

    const url = `${SEARCH_URL}&keyword=${encodeURIComponent(query)}`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 2000))

    page.off('response', responseHandler)

    // Also check embedded Next.js data
    const embedded = await page.evaluate(() => {
      try {
        const s = document.getElementById('__NEXT_DATA__')
        if (!s) return []
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
        return walk(JSON.parse(s.textContent))
      } catch { return [] }
    })

    const allRaw = [...intercepted, ...embedded]

    if (allRaw.length > 0) {
      for (const raw of allRaw) {
        const p = normalizeProduct(raw, query, url)
        if (p) products.push(p)
      }
    }

    // DOM fallback
    if (products.length === 0) {
      const domResults = await page.evaluate((baseUrl, query, url) => {
        const results = []
        const cards = Array.from(document.querySelectorAll(
          '[class*="ProductCard"], [class*="product-card"], [class*="ItemCard"], [data-product-id], a[href*="/products/"]'
        ))
        for (const card of cards.slice(0, 15)) {
          const nameEl = card.querySelector('[class*="name"], [class*="title"], h2, h3') ?? card
          const name = nameEl?.textContent?.trim() ?? ''
          if (!name || name.length < 3) continue
          const priceEl = Array.from(card.querySelectorAll('*')).find(
            (el) => el.children.length === 0 && /[¥￥]\d/.test(el.textContent)
          )
          const priceMatch = priceEl?.textContent?.replace(/[,¥￥\s]/g, '').match(/\d+/)
          const jpy = priceMatch ? parseInt(priceMatch[0]) : null
          const href = (card.tagName === 'A' ? card : card.querySelector('a'))?.getAttribute('href') ?? ''
          const idM  = href.match(/\/products\/([^/?#]+)/)
          results.push({
            name, query,
            product_id:    idM?.[1] ?? null,
            product_url:   idM ? `${baseUrl}/products/${idM[1]}` : null,
            min_price_jpy: jpy,
            min_price_usd: jpy ? Math.round(jpy * 0.0067 * 100) / 100 : null,
            display_price: jpy ? `¥${jpy.toLocaleString()}` : null,
            image_url:     card.querySelector('img')?.src ?? null,
            condition: null, listing_count: null, source_page: url, name_ja: null,
          })
        }
        return results
      }, BASE_URL, query, url)
      products.push(...domResults)
    }

  } finally {
    await browser.close()
  }

  // Score by query relevance
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1)
  const scored = products.map((p) => {
    const n = (p.name + ' ' + (p.name_ja ?? '')).toLowerCase()
    return { ...p, _score: terms.filter((t) => n.includes(t)).length }
  })
  scored.sort((a, b) => b._score - a._score)

  return scored.slice(0, top).map(({ _score, ...rest }) => rest)
}

async function main() {
  const { query, top } = parseArgs()
  if (!query) {
    process.stdout.write(JSON.stringify({ error: 'No query provided' }))
    process.exit(2)
  }

  let db
  try { db = new Database(DB_PATH) } catch { /* DB might not exist yet */ }

  // Check cache
  if (db) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS price_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
          query TEXT, product_id TEXT, product_url TEXT,
          name TEXT NOT NULL, name_ja TEXT, min_price_jpy INTEGER,
          min_price_usd REAL, display_price TEXT, image_url TEXT,
          condition TEXT, listing_count INTEGER, source_page TEXT
        )
      `)
      const cached = checkCache(db, query)
      if (cached.length > 0) {
        const out = top === 1 ? cached[0] : cached.slice(0, top)
        process.stdout.write(JSON.stringify({ source: 'cache', data: out }))
        db.close()
        process.exit(0)
      }
    } catch { /* ignore DB errors */ }
  }

  // Live scrape
  let results = []
  try {
    results = await fetchFromSnkrdunk(query, top)
  } catch (err) {
    if (db) db.close()
    process.stdout.write(JSON.stringify({ error: err.message }))
    process.exit(2)
  }

  // Save to DB
  if (db && results.length > 0) {
    try {
      const insert = db.prepare(`
        INSERT INTO price_records
          (query, product_id, product_url, name, name_ja, min_price_jpy, min_price_usd, display_price, image_url, condition, listing_count, source_page)
        VALUES
          (@query, @product_id, @product_url, @name, @name_ja, @min_price_jpy, @min_price_usd, @display_price, @image_url, @condition, @listing_count, @source_page)
      `)
      const txn = db.transaction((rows) => rows.forEach((r) => { try { insert.run(r) } catch {} }))
      txn(results)
    } catch { /* ignore */ }
  }

  if (db) db.close()

  if (results.length === 0) {
    process.stdout.write(JSON.stringify({ error: 'No results found', query }))
    process.exit(1)
  }

  const out = top === 1 ? results[0] : results.slice(0, top)
  process.stdout.write(JSON.stringify({ source: 'live', data: out }))
  process.exit(0)
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ error: err.message }))
  process.exit(2)
})
