import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getNotifications } from '@/services/notificationService'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { MarkAllReadButton } from './MarkAllReadButton'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const notifications = await getNotifications(session.user.id, 50)
  const unread = notifications.filter((n) => !n.isRead).length

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Notifications</h1>
          {unread > 0 && (
            <p className="text-sm text-zinc-500 mt-0.5">{unread} unread</p>
          )}
        </div>
        {unread > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm rounded-xl border border-zinc-800">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  )
}
