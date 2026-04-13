import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { runReleaseSync, runProviderByName } from '@/services/releases/releaseSyncService'

function getSyncAdminEmails(): string[] {
  return (process.env.SYNC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

function canRunSync(email: string | null | undefined): boolean {
  const allowed = getSyncAdminEmails()
  if (allowed.length === 0) return process.env.NODE_ENV !== 'production'
  if (!email) return false
  return allowed.includes(email.toLowerCase())
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!canRunSync(session.user.email)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const provider = searchParams.get('provider')

  try {
    if (provider) {
      const result = await runProviderByName(provider)
      if (!result) return NextResponse.json({ ok: false, error: `Unknown provider: ${provider}` }, { status: 400 })
      return NextResponse.json({ ok: true, data: result })
    }

    const result = await runReleaseSync()
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
