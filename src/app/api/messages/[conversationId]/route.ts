import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMessages, sendMessage, getConversationById } from '@/services/messagingService'

type Params = { params: Promise<{ conversationId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params
  const [messages, conversation] = await Promise.all([
    getMessages(conversationId, session.user.id),
    getConversationById(conversationId, session.user.id),
  ])

  return NextResponse.json({ ok: true, data: { messages, conversation } })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params
  const { body } = await req.json()
  if (!body?.trim()) {
    return NextResponse.json({ ok: false, error: 'Message body required' }, { status: 400 })
  }

  const message = await sendMessage({
    conversationId,
    senderUserId: session.user.id,
    body: body.trim(),
  })

  return NextResponse.json({ ok: true, data: message }, { status: 201 })
}
