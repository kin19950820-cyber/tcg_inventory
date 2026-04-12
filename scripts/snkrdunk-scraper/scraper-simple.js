/**
 * SNKRDUNK Trading Card Price Scraper (Simplified - No Database)
 * ==============================================================
 * Uses Puppeteer to scrape SNKRDUNK (スニーカーダンク) for trading card sold prices.
 * This version doesn't require better-sqlite3 (no C++ build tools needed).
 *
 * Usage:
 *   node scraper-simple.js "charizard ex"
 *   node scraper-simple.js --query="pikachu" --limit=5
 *   node scraper-simple.js --url="https://snkrdunk.com/products/XXXXX"
 *   node scraper-simple.js --query="charizard" --csv
 */

'use strict'

const puppeteer = require('puppeteer')
const { createObjectCsvWriter } = require('csv-writer')
const path = require('path')
const fs = require('fs')

// ── Config ────────────────────────────────────────────────────────────────────

const CSV_DIR = path.join(__dirname, 'exports')
const JPY_RATE = parseFloat(process.env.JPY_USD_RATE ?? '0.0067') // ≈149 JPY/USD

const BASE_URL = 'https://snkrdunk.com'
const SEARCH_URL = `${BASE_URL}/apparel-categories/25?department_name=hobby`
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

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

function looksLikeProductData(obj) {
  if (!obj || typeof obj !== 'object') return false
  if (Array.isArray(obj)) {
    return obj.length > 0 && obj[0] && ('name' in obj[0] || 'minPrice' in obj[0] || 'displayPrice' in obj[0])
  }
  for (const key of ['products', 'items', 'results', 'data', 'hottestHobbies', 'usedHobbies', 'latestHobbies']) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) return true
  }
  return false
}

function flattenProducts(obj) {
  if (Array.isArray(obj)) return obj
  for (const key of ['products', 'items', 'results', 'data', 'hottestHobbies', 'usedHobbies', 'latestHobbies']) {
    if (Array.isArray(obj[key])) return obj[key]
  }
  return []
}

function normalizeProduct(raw) {
  const name = raw.name || raw.title || ''
  const nameJa = raw.name_ja || raw.nameJa || ''
  const minJpy = parseJpy(raw.minPrice || raw.min_price || raw.displayPrice)
  const minUsd = jpyToUsd(minJpy)
  const imageUrl = raw.imagePath || raw.imageUrl || raw.image_url || ''
  const url = raw.url || raw.product_url || `${BASE_URL}/products/${raw.id}`
  const condition = raw.condition || raw.conditionCategory || ''
  const listingCount = raw.numberOfListings || raw.listing_count || 0

  return {
    id: raw.id || '',
    name: String(name).trim(),
    name_ja: String(nameJa).trim(),
    min_price_jpy: minJpy,
    min_price_usd: minUsd,
    display_price: raw.displayPrice || '',
    image_url: String(imageUrl).trim(),
    condition: String(condition).trim(),
    listing_count: parseInt(listingCount, 10) || 0,
    url: String(url).trim(),
  }
}

// ── Scraper ───────────────────────────────────────────────────────────────────

async function scrapeSearch(query, limit = 50) {
  console.log(`🔍 Scraping SNKRDUNK for: "${query}" (limit: ${limit})`)

  let browser
  const results = []
  let interceptedData = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(30000)
    await page.setUserAgent(USER_AGENT)

    // Intercept responses that look like product data
    page.on('response', async (response) => {
      try {
        if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
          const text = await response.text()
          try {
            const json = JSON.parse(text)
            if (looksLikeProductData(json)) {
              interceptedData = json
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      } catch (e) {
        // Ignore errors, continue
      }
    })

    // Navigate to search
    const searchUrl = `${SEARCH_URL}&search_word=${encodeURIComponent(query)}`
    console.log(`📄 Navigating to: ${searchUrl}`)
    await page.goto(searchUrl, { waitUntil: 'networkidle2' })

    // Wait for results to appear
    await page.waitForSelector('[class*="product"]', { timeout: 5000 }).catch(() => null)

    if (interceptedData) {
      console.log('✅ Found products via API interception')
      const products = flattenProducts(interceptedData)
      return products.slice(0, limit).map(normalizeProduct)
    }

    // Fallback: DOM scraping
    console.log('📍 Falling back to DOM scraping...')
    const domResults = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[class*="product"]'))
      return items
        .slice(0, 50)
        .map((item) => ({
          name: item.querySelector('h2')?.textContent?.trim() || item.textContent.slice(0, 50),
          minPrice: item.querySelector('[class*="price"]')?.textContent || '¥0',
          imageUrl: item.querySelector('img')?.src || '',
          url: item.querySelector('a')?.href || '',
        }))
    })

    return domResults.slice(0, limit).map(normalizeProduct)
  } catch (err) {
    console.error('❌ Scrape error:', err.message)
    return []
  } finally {
    if (browser) await browser.close()
  }
}

async function scrapeSingleProduct(url) {
  console.log(`🔍 Scraping URL: ${url}`)

  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(30000)
    await page.setUserAgent(USER_AGENT)

    await page.goto(url, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[class*="price"]', { timeout: 5000 }).catch(() => null)

    const result = await page.evaluate(() => ({
      name: document.querySelector('h1')?.textContent?.trim() || '',
      minPrice: document.querySelector('[class*="price"]')?.textContent || '¥0',
      imageUrl: document.querySelector('img')?.src || '',
    }))

    return normalizeProduct({ ...result, id: url.split('/').pop() })
  } catch (err) {
    console.error('❌ Scrape error:', err.message)
    return null
  } finally {
    if (browser) await browser.close()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  let query = null
  let url = null
  let limit = 50
  let csv = false

  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith('--query=')) query = arg.split('=')[1]
    else if (arg.startsWith('--url=')) url = arg.split('=')[1]
    else if (arg.startsWith('--limit=')) limit = parseInt(arg.split('=')[1], 10)
    else if (arg === '--csv') csv = true
    else if (arg.startsWith('-')) continue
    else query = arg // positional argument
  }

  console.log('\n🎮 SNKRDUNK Scraper (Simple)\n')

  let results

  if (url) {
    const result = await scrapeSingleProduct(url)
    results = result ? [result] : []
  } else if (query) {
    results = await scrapeSearch(query, limit)
  } else {
    console.log('Usage:')
    console.log('  node scraper-simple.js "charizard ex"')
    console.log('  node scraper-simple.js --query="pikachu" --limit=5')
    console.log('  node scraper-simple.js --url="https://snkrdunk.com/products/XXXXX"')
    console.log('  node scraper-simple.js --query="charizard" --csv')
    return
  }

  // Display results
  console.log(`\n📊 Found ${results.length} results:\n`)
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} (${r.name_ja})`)
    console.log(`   JPY: ¥${r.min_price_jpy || 'N/A'} | USD: $${r.min_price_usd || 'N/A'}`)
    console.log(`   Listings: ${r.listing_count} | Condition: ${r.condition || 'N/A'}`)
    console.log(`   URL: ${r.url}`)
    console.log()
  })

  // Export to CSV if requested
  if (csv && results.length > 0) {
    if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const csvPath = path.join(CSV_DIR, `snkrdunk_${query || 'export'}_${timestamp}.csv`)

    const writer = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'name', title: 'Product Name' },
        { id: 'name_ja', title: 'Product Name (JP)' },
        { id: 'min_price_jpy', title: 'Min Price (JPY)' },
        { id: 'min_price_usd', title: 'Min Price (USD)' },
        { id: 'listing_count', title: 'Listings' },
        { id: 'condition', title: 'Condition' },
        { id: 'url', title: 'URL' },
      ],
    })

    await writer.writeRecords(results)
    console.log(`✅ Exported to: ${csvPath}`)
  }
}

main().catch(console.error)
