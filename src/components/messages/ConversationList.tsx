'use client'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type User = { id: string; username: string; displayName: string | null; avatarUrl: string | null }
type ConversationItem = {
  id: string
  updatedAt: string | Date
  otherParticipants: User[]
  lastMessage: { body: string; messageType: string; createdAt: string | Date } | null
  unreadCount: number
}

interface Props {
  conversations: ConversationItem[]
  currentUserId: string
}

export function ConversationList({ conversations, currentUserId: _currentUserId }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600 text-sm rounded-xl border border-zinc-800">
        No conversations yet. Start one from someone's profile page.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800">
      {conversations.map((conv) => {
        const other = conv.otherParticipants[0]
        const initial = (other?.displayName ?? other?.username ?? '?')[0]?.toUpperCase()
        const name = other?.displayName ?? other?.username ?? 'Unknown'
        const preview = conv.lastMessage
          ? conv.lastMessage.messageType === 'SYSTEM'
            ? conv.lastMessage.body
            : conv.lastMessage.body.slice(0, 80)
          : 'No messages yet'

        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-brand-600/30 border border-brand-600/50 flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
              {initial}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-100 truncate">{name}</p>
                <p className="text-xs text-zinc-600 flex-shrink-0">
                  {formatDate(conv.lastMessage?.createdAt ?? conv.updatedAt)}
                </p>
              </div>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{preview}</p>
            </div>

            {/* Unread badge */}
            {conv.unreadCount > 0 && (
              <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {conv.unreadCount}
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
