'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, MessageSquare, ArrowLeftRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  isRead: boolean
  relatedId: string | null
  relatedType: string | null
  createdAt: string | Date
}

interface Props {
  notification: Notification
}

const TYPE_ICONS: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  NEW_MESSAGE:       MessageSquare,
  NEW_TRADE_PROPOSAL: ArrowLeftRight,
  TRADE_ACCEPTED:    ArrowLeftRight,
  TRADE_REJECTED:    ArrowLeftRight,
  TRADE_COUNTERED:   ArrowLeftRight,
  TRADE_CANCELLED:   ArrowLeftRight,
  RELEASE_REMINDER:  Package,
  PREORDER_REMINDER: Package,
  ANNOUNCEMENT:      Package,
  PRODUCT_RELEASED:  Package,
}

const TYPE_COLORS: Record<string, string> = {
  NEW_MESSAGE:        'text-brand-400 bg-brand-600/20',
  NEW_TRADE_PROPOSAL: 'text-yellow-400 bg-yellow-500/20',
  TRADE_ACCEPTED:     'text-green-400 bg-green-500/20',
  TRADE_REJECTED:     'text-red-400 bg-red-500/20',
  TRADE_COUNTERED:    'text-blue-400 bg-blue-500/20',
  TRADE_CANCELLED:    'text-zinc-400 bg-zinc-700/40',
  RELEASE_REMINDER:   'text-purple-400 bg-purple-500/20',
  PREORDER_REMINDER:  'text-orange-400 bg-orange-500/20',
  ANNOUNCEMENT:       'text-teal-400 bg-teal-500/20',
  PRODUCT_RELEASED:   'text-green-400 bg-green-500/20',
}

function getHref(notification: Notification): string | null {
  if (notification.relatedType === 'CONVERSATION' && notification.relatedId) {
    return `/messages/${notification.relatedId}`
  }
  if (notification.relatedType === 'TRADE_PROPOSAL' && notification.relatedId) {
    return `/messages` // trade proposals live inside a conversation thread
  }
  if (notification.relatedType === 'PRODUCT_RELEASE' && notification.relatedId) {
    return `/products`
  }
  return null
}

export function NotificationItem({ notification }: Props) {
  const router = useRouter()
  const Icon = TYPE_ICONS[notification.type] ?? Bell
  const colorClass = TYPE_COLORS[notification.type] ?? 'text-zinc-400 bg-zinc-700/40'
  const href = getHref(notification)

  const handleClick = async () => {
    if (!notification.isRead) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      })
      router.refresh()
    }
    if (href) router.push(href)
  }

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg transition-colors',
        notification.isRead ? 'opacity-60' : 'bg-zinc-800/40',
        href && 'cursor-pointer hover:bg-zinc-800/70'
      )}
      onClick={href ? handleClick : undefined}
    >
      {/* Icon */}
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
        <Icon size={14} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-100 font-medium">{notification.title}</p>
        {notification.body && (
          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-zinc-600 mt-1">{formatDate(notification.createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
      )}
    </div>
  )

  return content
}
