import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getProposal, updateProposalStatus } from '@/services/tradeProposalService'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const proposal = await getProposal(id)
  if (!proposal) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  const isParticipant =
    proposal.proposerUserId === session.user.id ||
    proposal.recipientUserId === session.user.id
  if (!isParticipant) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, data: proposal })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { status } = await req.json()

  const VALID = ['ACCEPTED', 'REJECTED', 'COUNTERED', 'CANCELLED']
  if (!VALID.includes(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 })
  }

  try {
    const updated = await updateProposalStatus(id, status, session.user.id)
    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to update proposal' },
      { status: 400 },
    )
  }
}
