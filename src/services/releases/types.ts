/**
 * Shared types for the product release ingestion system.
 */

export type ReleaseStatus =
  | 'ANNOUNCED'
  | 'COMING_SOON'
  | 'PREORDER_UPCOMING'
  | 'PREORDER_OPEN'
  | 'RELEASED'
  | 'SOLD_OUT'
  | 'ARCHIVED'
  | 'UNKNOWN'

export type ReleaseCategory = 'TCG' | 'SPORTS'

/** Normalised product record returned by every provider. */
export interface NormalizedRelease {
  /** Unique ID within the source (used for deduplication). */
  sourceExternalId: string
  sourceName:       string
  sourceUrl:        string | null

  name:             string
  category:         ReleaseCategory
  manufacturer:     string | null
  brand:            string | null
  productLine:      string | null
  sport:            string | null
  game:             string | null
  season:           string | null
  year:             number | null

  imageUrl:         string | null
  externalUrl:      string | null
  description:      string | null

  announcementDate: Date | null
  preorderDate:     Date | null
  releaseDate:      Date | null

  /** Derived or parsed from source text. */
  status:           ReleaseStatus
}

/** What every provider must implement. */
export interface ReleaseProvider {
  name: string
  fetch(): Promise<NormalizedRelease[]>
}

/** Result from the sync orchestrator for a single provider. */
export interface ProviderSyncResult {
  providerName:  string
  success:       boolean
  insertedCount: number
  updatedCount:  number
  failedCount:   number
  errorSummary:  string | null
}

// ── Status helpers ────────────────────────────────────────────────────────────

export function deriveStatus(
  releaseDate: Date | null,
  preorderDate: Date | null,
  announcementDate: Date | null,
  rawStatusHint?: string,
): ReleaseStatus {
  const now = new Date()
  const hint = (rawStatusHint ?? '').toLowerCase()

  if (hint.includes('sold out'))        return 'SOLD_OUT'
  if (hint.includes('archived'))        return 'ARCHIVED'

  if (releaseDate) {
    if (releaseDate <= now) return 'RELEASED'
    const daysUntil = (releaseDate.getTime() - now.getTime()) / 86400000
    if (daysUntil <= 90) return 'COMING_SOON'
    return 'ANNOUNCED'
  }

  if (preorderDate) {
    if (preorderDate <= now) return 'PREORDER_OPEN'
    return 'PREORDER_UPCOMING'
  }

  if (announcementDate) return 'ANNOUNCED'

  if (hint.includes('pre-order') || hint.includes('preorder')) return 'PREORDER_OPEN'
  if (hint.includes('coming soon')) return 'COMING_SOON'
  if (hint.includes('announced'))  return 'ANNOUNCED'

  return 'UNKNOWN'
}

/** Parse "2025/03/28" or "2025-03-28" into a Date, or return null. */
export function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  try {
    const normalised = raw.replace(/\//g, '-')
    const d = new Date(normalised)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/** Normalise a season string like "2025/26" → "2025-26". */
export function normaliseSeason(raw: string | null | undefined): string | null {
  if (!raw) return null
  return raw.replace(/[/\\]/g, '-').trim()
}
