import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getConversations, getOrCreateConversation } from '@/services/messagingService'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const conversations = await getConversations(session.user.id)
  return NextResponse.json({ ok: true, data: conversations })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { recipientUserId } = await req.json()
  if (!recipientUserId) {
    return NextResponse.json({ ok: false, error: 'recipientUserId required' }, { status: 400 })
  }
  if (recipientUserId === session.user.id) {
    return NextResponse.json({ ok: false, error: 'Cannot message yourself' }, { status: 400 })
  }

  const conversation = await getOrCreateConversation(session.user.id, recipientUserId)
  return NextResponse.json({ ok: true, data: conversation })
}
