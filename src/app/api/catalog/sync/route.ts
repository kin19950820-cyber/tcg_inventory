import { NextRequest, NextResponse } from 'next/server'
import { runCatalogSync, runSportsSync, runPokemonSetSync } from '@/services/catalogSyncService'

// Extend Vercel function timeout (Pro plan: up to 300s, Hobby: 10s max)
// On Hobby plan use ?mode=sports or ?set=sv3 for fast single-operation syncs.
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret configured — open (dev only)
  return req.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * POST /api/catalog/sync
 *
 * Query params:
 *   ?mode=sports   — upsert sports catalog only (~2 s, works on Hobby)
 *   ?mode=pokemon  — sync all Pokemon sets  (~60 s, needs Pro)
 *   ?set=sv3       — sync a single Pokemon set (~3 s, works on Hobby)
 *   (none)         — full sync: cleanup + sports + all Pokemon sets
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Vercel Cron sends this automatically if CRON_SECRET is set in env.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mode = req.nextUrl.searchParams.get('mode')
  const set  = req.nextUrl.searchParams.get('set')

  try {
    if (set) {
      // Single Pokemon set — fast, works on Hobby plan
      const result = await runPokemonSetSync(set)
      return NextResponse.json(result)
    }

    if (mode === 'sports') {
      // Sports-only — very fast, works on Hobby plan
      const result = await runSportsSync()
      return NextResponse.json(result)
    }

    // Full sync — needs Pro plan (or run per-set via cron rotation)
    const result = await runCatalogSync()
    return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { POKEMON_SYNC_SETS } = await import('@/services/scrapers/pokemonTcgScraper')
  return NextResponse.json({
    hint: 'POST to trigger sync. Use ?mode=sports or ?set=sv3 on Hobby plan.',
    sets: POKEMON_SYNC_SETS,
  })
}
