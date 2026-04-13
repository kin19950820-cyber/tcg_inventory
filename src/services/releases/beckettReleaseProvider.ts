/**
 * Beckett Release Calendar Provider
 *
 * Scrapes https://www.beckett.com/news/category/release-dates/
 * Returns products announced on Beckett's release calendar.
 *
 * Implementation: lightweight HTTP fetch + regex parsing (Beckett renders mostly
 * static HTML for the release calendar articles). Falls back to empty array on error.
 */
import type { NormalizedRelease, ReleaseProvider } from './types'
import { deriveStatus, parseDate } from './types'

const SOURCE     = 'beckett'
const SOURCE_URL = 'https://www.beckett.com/news/category/release-dates/'

// Pattern matching for date strings in Beckett articles: "March 5, 2025" or "3/5/2025"
function extractDates(text: string): Date | null {
  const patterns = [
    /\b(\w+ \d{1,2},\s*\d{4})\b/,           // "March 5, 2025"
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,        // "3/5/2025"
    /\b(\d{4}-\d{2}-\d{2})\b/,              // "2025-03-05"
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return parseDate(m[1])
  }
  return null
}

function inferManufacturer(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes('panini'))  return 'Panini'
  if (n.includes('topps'))   return 'Topps'
  if (n.includes('upper deck')) return 'Upper Deck'
  if (n.includes('leaf'))    return 'Leaf'
  if (n.includes('donruss')) return 'Panini'
  if (n.includes('pokemon')) return 'The Pokemon Company'
  return null
}

function inferCategory(name: string): 'TCG' | 'SPORTS' {
  const n = name.toLowerCase()
  if (n.includes('pokemon') || n.includes('magic') || n.includes('yu-gi-oh') || n.includes('lorcana')) return 'TCG'
  return 'SPORTS'
}

function inferSport(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes('basketball') || n.includes('nba')) return 'Basketball'
  if (n.includes('baseball') || n.includes('mlb'))   return 'Baseball'
  if (n.includes('football') || n.includes('nfl'))   return 'Football'
  if (n.includes('hockey') || n.includes('nhl'))     return 'Hockey'
  if (n.includes('soccer') || n.includes('mls'))     return 'Soccer'
  if (n.includes('ufc') || n.includes('mma'))        return 'MMA'
  if (n.includes('golf'))                            return 'Golf'
  if (n.includes('formula') || n.includes(' f1'))    return 'F1'
  return null
}

export const beckettReleaseProvider: ReleaseProvider = {
  name: SOURCE,

  async fetch(): Promise<NormalizedRelease[]> {
    try {
      const res = await fetch(SOURCE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        cache: 'no-store',
      })
      if (!res.ok) return []

      const html = await res.text()
      const results: NormalizedRelease[] = []

      // Each article is typically <article ...><h2 ...><a href="...">TITLE</a></h2>...</article>
      // Extract title + href pairs
      const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi
      let m: RegExpExecArray | null

      while ((m = articleRe.exec(html)) !== null) {
        const block = m[1]

        const titleM = block.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/)
        if (!titleM) continue

        const url   = titleM[1].startsWith('http') ? titleM[1] : `https://www.beckett.com${titleM[1]}`
        const title = titleM[2].trim()
        if (!title || title.length < 5) continue

        const releaseDate = extractDates(block)
        const category    = inferCategory(title)
        const sport       = inferSport(title)
        const manufacturer = inferManufacturer(title)
        const status      = deriveStatus(releaseDate, null, null)

        // Extract year from title like "2025 Topps..." or "2024-25 Panini..."
        const yearM = title.match(/\b(20\d\d)\b/)
        const year  = yearM ? parseInt(yearM[1]) : null

        const seasonM = title.match(/\b(20\d\d[-/]\d{2,4})\b/)
        const season  = seasonM ? seasonM[1].replace('/', '-') : null

        results.push({
          sourceExternalId: url,
          sourceName:       SOURCE,
          sourceUrl:        SOURCE_URL,
          name:             title,
          category,
          manufacturer,
          brand:            null,
          productLine:      null,
          sport,
          game:             category === 'TCG' ? 'pokemon' : (sport?.toLowerCase() ?? null),
          season,
          year,
          imageUrl:         null,
          externalUrl:      url,
          description:      null,
          announcementDate: null,
          preorderDate:     null,
          releaseDate,
          status,
        })
      }

      return results
    } catch {
      return []
    }
  },
}
