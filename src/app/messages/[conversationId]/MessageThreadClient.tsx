'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeProposalCard } from '@/components/messages/TradeProposalCard'
import { formatDate } from '@/lib/utils'

type User = { id: string; username: string; displayName: string | null; avatarUrl: string | null }
type Message = {
  id: string; body: string; messageType: string; createdAt: string | Date
  senderUserId: string; sender: User
}
type TradeProposal = {
  id: string; status: string; proposerUserId: string; recipientUserId: string
  cashAdjustmentAmount: number; note: string | null; createdAt: string | Date
  items: Array<{
    id: string; ownerUserId: string; quantity: number
    snapshotName: string | null; snapshotValue: number | null
    inventoryItem: { id: string; cardName: string; playerName: string | null; imageUrl: string | null; category: string }
    owner: { id: string; username: string; displayName: string | null }
  }>
}

interface Props {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
  otherParticipants: User[]
  tradeProposals: TradeProposal[]
}

export function MessageThreadClient({
  conversationId, initialMessages, currentUserId, otherParticipants, tradeProposals,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const otherUser = otherParticipants[0]

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true)

    const res = await fetch(`/api/messages/${conversationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    const json = await res.json()

    if (json.ok) {
      setMessages((prev) => [...prev, json.data])
      setBody('')
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800 mb-3">
        <Link href="/messages" className="text-zinc-500 hover:text-zinc-300">
          <ArrowLeft size={18} />
        </Link>
        <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-600/50 flex items-center justify-center text-brand-400 font-bold text-sm">
          {(otherUser?.displayName ?? otherUser?.username ?? '?')[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-100">
            {otherUser?.displayName ?? otherUser?.username}
          </p>
          <Link href={`/u/${otherUser?.username}`} className="text-xs text-zinc-600 hover:text-zinc-400">
            @{otherUser?.username}
          </Link>
        </div>
      </div>

      {/* Trade proposals (pinned at top if any) */}
      {tradeProposals.length > 0 && (
        <div className="space-y-2 mb-3">
          {tradeProposals.map((tp) => (
            <TradeProposalCard
              key={tp.id}
              proposal={tp}
              currentUserId={currentUserId}
              onStatusChange={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => {
          const isOwn = msg.senderUserId === currentUserId
          const isSystem = msg.messageType === 'SYSTEM'

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <p className="text-xs text-zinc-500 bg-zinc-800/60 rounded-full px-3 py-1">
                  {msg.body}
                </p>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isOwn
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <p className="text-xs text-zinc-600 px-1">
                  {formatDate(msg.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-end gap-2 pt-3 border-t border-zinc-800 mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent) }
          }}
          rows={2}
          placeholder="Type a message…"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <Button type="submit" size="sm" loading={sending} className="h-[46px]">
          <Send size={14} />
        </Button>
      </form>
    </div>
  )
}
