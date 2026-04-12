import { NextRequest, NextResponse } from 'next/server'
import { runCatalogSync } from '@/services/catalogSyncService'

/**
 * POST /api/catalog/sync
 *
 * Triggered two ways:
 *  1. Vercel Cron — daily at 04:00 UTC (configured in vercel.json)
 *     Vercel injects: Authorization: Bearer <CRON_SECRET>
 *  2. Manual — from admin UI or curl, same auth header required
 *
 * curl example:
 *   curl -X POST https://your-app.vercel.app/api/catalog/sync \
 *        -H "Authorization: Bearer your_cron_secret"
 */
export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ── Run sync (can take 30–60 s depending on number of sets) ───────────────
  const result = await runCatalogSync()

  const status = result.status === 'error' ? 500 : 200
  return NextResponse.json(result, { status })
}

/**
 * GET /api/catalog/sync
 * Returns last sync info (future: store to DB). For now just confirms the
 * route exists and auth is working.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.json({
    message: 'POST to this endpoint to trigger a catalog sync',
    sets: (await import('@/services/scrapers/pokemonTcgScraper')).POKEMON_SYNC_SETS,
  })
}
