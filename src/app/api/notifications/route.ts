import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/services/notificationService'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = req.nextUrl
  const limit = parseInt(searchParams.get('limit') ?? '30')

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.user.id, limit),
    getUnreadCount(session.user.id),
  ])

  return NextResponse.json({ ok: true, data: { notifications, unreadCount } })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  if (body.markAllRead) {
    await markAllAsRead(session.user.id)
  } else if (body.notificationId) {
    await markAsRead(body.notificationId, session.user.id)
  }

  return NextResponse.json({ ok: true })
}
