import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPublicProfile, getPublicInventory } from '@/services/userProfileService'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ username: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  const { username } = await params

  const profile = await getPublicProfile(username)
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
  }

  if ((profile as { hidden?: boolean }).hidden) {
    return NextResponse.json({ ok: true, data: { profile, inventory: [], isPrivate: true } })
  }

  const inventory = await getPublicInventory(profile.id, session?.user?.id)

  return NextResponse.json({ ok: true, data: { profile, inventory, isPrivate: false } })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { username } = await params
  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })
  if (!target || target.id !== session.user.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { updateProfile } = await import('@/services/userProfileService')
    const body = await req.json()
    const updated = await updateProfile(session.user.id, body)
    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Update failed' },
      { status: 400 },
    )
  }
}
