/**
 * eBay Sold Listings Puppeteer Scraper
 * ======================================
 * Fetches recent SOLD listings from eBay using Puppeteer.
 * Bypasses Cloudflare/bot-detection that blocks plain HTTP fetches.
 *
 * Usage:
 *   node ebay-scraper.js "charizard ex obsidian flames"
 *   node ebay-scraper.js --query="wemby prizm silver rc" --limit=5
 *   node ebay-scraper.js --query="pikachu" --category=2536 --limit=8
 *
 * Returns JSON on stdout:
 *   { source: "ebay-puppeteer", data: [ { title, price, soldDate, condition, url }, ... ] }
 *
 * Category IDs:
 *   2536   = Non-Sport Trading Cards (TCG/Pokemon)
 *   261329 = Sports Trading Cards
 */

'use strict'

const puppeteer = require('puppeteer')
const path      = require('path')
const Database  = require('better-sqlite3')

const DB_PATH    = path.join(__dirname, 'prices.db')
const BASE_URL   = 'https://www.ebay.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Cache TTL in minutes
const CACHE_TTL  = parseInt(process.env.EBAY_CACHE_TTL ?? '60')

// ── DB setup ──────────────────────────────────────────────────────────────────

function openDb() {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS ebay_comps (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scraped_at  TEXT NOT NULL DEFAULT (datetime('now')),
      query       TEXT,
      title       TEXT NOT NULL,
      price_usd   REAL,
      sold_date   TEXT,
      condition   TEXT,
      url         TEXT,
      image_url   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ebay_query ON ebay_comps(query);
    CREATE INDEX IF NOT EXISTS idx_ebay_at    ON ebay_comps(scraped_at);
  `)
  return db
}

function checkCache(db, query) {
  const cutoff = new Date(Date.now() - CACHE_TTL * 60 * 1000).toISOString()
  return db.prepare(`
    SELECT * FROM ebay_comps
    WHERE lower(query) = lower(?) AND scraped_at >= ? AND price_usd IS NOT NULL
    ORDER BY scraped_at DESC LIMIT 10
  `).all(query, cutoff)
}

function saveComps(db, query, comps) {
  const insert = db.prepare(`
    INSERT INTO ebay_comps (query, title, price_usd, sold_date, condition, url, image_url)
    VALUES (@query, @title, @price_usd, @sold_date, @condition, @url, @image_url)
  `)
  const txn = db.transaction((rows) => rows.forEach((r) => { try { insert.run(r) } catch {} }))
  txn(comps.map((c) => ({ ...c, query })))
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parsePrice(text) {
  if (!text) return null
  const m = text.replace(/,/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

function parseDate(text) {
  if (!text) return null
  // eBay format: "Sold  Dec 5, 2024" or "Dec 5, 2024"
  const cleaned = text.replace(/^Sold\s*/i, '').trim()
  try {
    const d = new Date(cleaned)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
  } catch { return null }
}

// ── Scrape eBay completed listings ────────────────────────────────────────────

async function scrapeEbaySold(query, limit = 8, categoryId = null) {
  const params = new URLSearchParams({
    _nkw:        query,
    LH_Complete: '1',
    LH_Sold:     '1',
    _sop:        '13',    // Sort: most recently ended
    _ipg:        '25',
  })
  if (categoryId) params.set('_sacat', String(categoryId))

  const url = `${BASE_URL}/sch/i.html?${params}`

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 900 },
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    // Block media/fonts/tracking — keep JSON/HTML
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const rt  = req.resourceType()
      const url = req.url()
      if (rt === 'media' || rt === 'font' ||
          url.includes('googletagmanager') || url.includes('facebook')) {
        req.abort()
      } else {
        req.continue()
      }
    })

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for listing items to appear
    await page.waitForSelector('.s-item', { timeout: 10000 }).catch(() => {})

    const comps = await page.evaluate((limit) => {
      const results = []

      // Each sold listing is an <li class="s-item ...">
      const items = Array.from(document.querySelectorAll('li.s-item, li[class*="s-item"]'))

      for (const item of items) {
        if (results.length >= limit) break

        // Skip the first placeholder eBay always renders
        const titleEl = item.querySelector('.s-item__title, [class*="s-item__title"]')
        const title = titleEl?.textContent?.trim() ?? ''
        if (!title || title === 'Shop on eBay' || title.length < 5) continue

        // Price
        const priceEl = item.querySelector('.s-item__price, [class*="s-item__price"]')
        const priceText = priceEl?.textContent?.trim() ?? ''

        // Sold date — inside a tagblock or POSITIVE span
        const dateEl = item.querySelector(
          '.s-item__title--tagblock .POSITIVE, ' +
          '.s-item__caption--signal .POSITIVE, ' +
          '[class*="s-item__detail--secondary"]'
        )
        const dateText = dateEl?.textContent?.trim() ?? ''

        // Condition
        const condEl = item.querySelector(
          '.SECONDARY_INFO, [class*="s-item__subtitle"], [class*="s-item__condition"]'
        )
        const condition = condEl?.textContent?.trim() ?? null

        // URL
        const linkEl = item.querySelector('a.s-item__link, a[class*="s-item__link"]')
        const href   = linkEl?.getAttribute('href') ?? null
        const itemUrl = href ? href.split('?')[0] : null

        // Image
        const imgEl = item.querySelector('img.s-item__image-img, img[class*="s-item__image"]')
        const imgSrc = imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? null

        // Parse price — handle ranges "USD 10.00 to USD 20.00"
        const priceMatch = priceText.replace(/,/g, '').match(/[\d.]+/)
        const price = priceMatch ? parseFloat(priceMatch[0]) : null
        if (!price || price < 0.01) continue

        results.push({
          title,
          price_usd:  price,
          sold_date:  dateText || null,
          condition,
          url:        itemUrl,
          image_url:  imgSrc,
        })
      }

      return results
    }, limit)

    // Parse dates in Node context (more reliable than browser Date parsing)
    return comps.map((c) => ({
      ...c,
      sold_date: parseDate(c.sold_date),
    }))

  } finally {
    await browser.close()
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args  = process.argv.slice(2)
  const opts  = { query: null, limit: 8, category: null, noCache: false }
  for (const a of args) {
    if (a.startsWith('--query='))    opts.query    = a.split('=').slice(1).join('=')
    else if (a.startsWith('--limit='))  opts.limit = parseInt(a.split('=')[1]) || 8
    else if (a.startsWith('--category=')) opts.category = a.split('=')[1]
    else if (a === '--no-cache')     opts.noCache  = true
    else if (!a.startsWith('--'))   opts.query    = a
  }
  return opts
}

async function main() {
  const { query, limit, category, noCache } = parseArgs()

  if (!query) {
    process.stdout.write(JSON.stringify({ error: 'No query provided' }))
    process.exit(2)
  }

  let db
  try { db = openDb() } catch { /* ignore */ }

  // Check cache
  if (!noCache && db) {
    const cached = checkCache(db, query)
    if (cached.length > 0) {
      if (db) db.close()
      process.stdout.write(JSON.stringify({ source: 'cache', data: cached.slice(0, limit) }))
      process.exit(0)
    }
  }

  // Live scrape
  let comps = []
  try {
    comps = await scrapeEbaySold(query, limit, category)
  } catch (err) {
    if (db) db.close()
    process.stdout.write(JSON.stringify({ error: err.message, query }))
    process.exit(2)
  }

  if (db && comps.length > 0) {
    try { saveComps(db, query, comps) } catch { /* ignore */ }
  }
  if (db) db.close()

  if (comps.length === 0) {
    process.stdout.write(JSON.stringify({ error: 'No sold listings found', query }))
    process.exit(1)
  }

  process.stdout.write(JSON.stringify({ source: 'ebay-puppeteer', data: comps }))
  process.exit(0)
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ error: err.message }))
  process.exit(2)
})
