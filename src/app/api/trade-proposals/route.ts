import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createTradeProposal } from '@/services/tradeProposalService'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const proposal = await createTradeProposal({
      ...body,
      proposerUserId: session.user.id,
    })
    return NextResponse.json({ ok: true, data: proposal }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to create proposal' },
      { status: 400 },
    )
  }
}
