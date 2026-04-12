import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { followProduct, unfollowProduct, getFollowStatus } from '@/services/productFollowService'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const status = await getFollowStatus(session.user.id, id)
  return NextResponse.json({ ok: true, data: status })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const follow = await followProduct(session.user.id, id, body)
  return NextResponse.json({ ok: true, data: follow })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await unfollowProduct(session.user.id, id)
  return NextResponse.json({ ok: true })
}
