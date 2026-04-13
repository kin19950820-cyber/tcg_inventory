/**
 * Shared utilities for pricing providers.
 */
import type { InventoryItem } from '@prisma/client'

// ── Condition guessing ─────────────────────────────────────────────────────────

export function guessCondition(title: string): string | null {
  const t = title.toLowerCase()
  if (t.includes('psa 10') || t.includes('gem mint')) return 'PSA 10'
  if (t.includes('psa 9.5')) return 'PSA 9.5'
  if (t.includes('psa 9')) return 'PSA 9'
  if (t.includes('psa 8')) return 'PSA 8'
  if (t.includes('bgs 10') || t.includes('pristine')) return 'BGS 10'
  if (t.includes('bgs 9.5') || t.includes('black label')) return 'BGS 9.5'
  if (t.includes('bgs 9')) return 'BGS 9'
  if (t.includes('cgc 10')) return 'CGC 10'
  if (t.includes('cgc 9.5')) return 'CGC 9.5'
  if (t.includes('sgc 10')) return 'SGC 10'
  if (t.includes('gem')) return 'Gem Mint'
  if (t.includes('nm/mt') || t.includes('near mint/mint')) return 'NM/MT'
  if (t.includes('nm') || t.includes('near mint')) return 'NM'
  if (t.includes('lp') || t.includes('light play') || t.includes('ex/nm') || t.includes('excellent')) return 'LP'
  if (t.includes('mp') || t.includes('moderate') || t.includes('very good')) return 'MP'
  if (t.includes('hp') || t.includes('heavy play') || t.includes('poor')) return 'HP'
  if (t.includes('dmg') || t.includes('damaged')) return 'DMG'
  return null
}

// ── Query builders ────────────────────────────────────────────────────────────

/**
 * Build an eBay search query for a TCG card.
 * Priority: cardName + setName + cardNumber + grade (or condition).
 */
export function buildTcgQuery(item: InventoryItem): string {
  const parts: string[] = [item.cardName]

  if (item.language === 'JA') {
    // For Japanese cards: include JP set name + "japanese" keyword for eBay
    // Skip the card number if it's still a placeholder (JP-xxx)
    if (item.setName) parts.push(item.setName)
    const jpNum = item.cardNumber && !item.cardNumber.startsWith('JP-') ? item.cardNumber : null
    if (jpNum) parts.push(jpNum)
    parts.push('japanese')
  } else {
    if (item.setName) parts.push(item.setName)
    if (item.cardNumber) parts.push(`#${item.cardNumber}`)
  }

  if (item.gradingCompany && item.grade) {
    parts.push(`${item.gradingCompany} ${item.grade}`)
  } else if (item.conditionRaw && item.language !== 'JA') {
    // Omit raw condition for JP cards — eBay JP listings rarely include EN condition tags
    parts.push(item.conditionRaw)
  }

  return parts.join(' ')
}

/**
 * Build an eBay search query for a sports card.
 * Priority: playerName + year/season + brand + parallel + grade + RC flag.
 */
export function buildSportsQuery(item: InventoryItem & {
  playerName?: string | null
  brand?: string | null
  parallel?: string | null
  rookie?: boolean
  season?: string | null
  year?: number | null
  manufacturer?: string | null
  autograph?: boolean
}): string {
  const parts: string[] = []

  // Player name is the most important identifier
  if (item.playerName) {
    parts.push(item.playerName)
  } else {
    parts.push(item.cardName)
  }

  // Year/season — e.g. "2023-24" or just "2024"
  const yearPart = item.season ?? (item.year ? String(item.year) : null)
  if (yearPart) parts.push(yearPart)

  // Manufacturer is secondary; brand (Prizm, Chrome) is primary identifier
  if (item.brand) parts.push(item.brand)

  // Parallel is critical for value (Silver Prizm vs base, etc.)
  if (item.parallel) parts.push(item.parallel)

  // Rookie designation
  if (item.rookie) parts.push('RC')

  // Autograph
  if (item.autograph) parts.push('AUTO')

  // Grade if applicable
  if (item.gradingCompany && item.grade) {
    parts.push(`${item.gradingCompany} ${item.grade}`)
  } else if (item.conditionRaw) {
    parts.push(item.conditionRaw)
  }

  return parts.join(' ')
}

// ── Confidence scoring ─────────────────────────────────────────────────────────

/**
 * Compute a 0–1 relevance score comparing a listing title to the item fields.
 * Used to weight or filter comps returned by external providers.
 */
export function computeConfidence(title: string, item: InventoryItem & {
  playerName?: string | null
  brand?: string | null
  parallel?: string | null
  season?: string | null
  year?: number | null
  rookie?: boolean
}): number {
  const t = title.toLowerCase()
  let matched = 0
  let total = 0

  // Primary name — must match
  const primaryName = (item.playerName ?? item.cardName).toLowerCase()
  const firstName = primaryName.split(' ')[0]
  total += 2  // weighted double
  if (t.includes(firstName)) matched += 2

  // Set or brand
  if (item.setName) {
    total++
    const setBrand = item.setName.toLowerCase().split(' ').slice(0, 2).join(' ')
    if (t.includes(setBrand) || (item as { brand?: string | null }).brand && t.includes(((item as { brand?: string | null }).brand ?? '').toLowerCase())) matched++
  }

  // Parallel (Silver, Gold, etc.)
  if (item.parallel) {
    total++
    const parallelFirst = item.parallel.toLowerCase().split(' ')[0]
    if (t.includes(parallelFirst)) matched++
  }

  // Grade (PSA 10, etc.)
  if (item.gradingCompany && item.grade) {
    total++
    if (t.includes(item.gradingCompany.toLowerCase()) && t.includes(item.grade.toLowerCase())) matched++
  }

  // Season / year
  const yearPart = item.season ?? (item.year ? String(item.year) : null)
  if (yearPart) {
    total++
    if (t.includes(yearPart.toLowerCase().slice(0, 4))) matched++  // match first 4 chars of year
  }

  return total > 0 ? Math.min(matched / total, 1) : 0.5
}
