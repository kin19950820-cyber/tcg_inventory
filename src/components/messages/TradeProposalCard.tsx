'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

type User = { id: string; username: string; displayName: string | null }
type ProposalItem = {
  id: string
  ownerUserId: string
  quantity: number
  snapshotName: string | null
  snapshotValue: number | null
  inventoryItem: { id: string; cardName: string; playerName: string | null; imageUrl: string | null; category: string }
  owner: User
}
type Proposal = {
  id: string
  status: string
  proposerUserId: string
  recipientUserId: string
  cashAdjustmentAmount: number
  note: string | null
  createdAt: string | Date
  items: ProposalItem[]
}

interface Props {
  proposal: Proposal
  currentUserId: string
  onStatusChange: () => void
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  ACCEPTED:  'bg-green-500/10 text-green-400 border-green-500/30',
  REJECTED:  'bg-red-500/10 text-red-400 border-red-500/30',
  COUNTERED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  CANCELLED: 'bg-zinc-700/40 text-zinc-500 border-zinc-700',
}

export function TradeProposalCard({ proposal, currentUserId, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false)

  const isProposer = proposal.proposerUserId === currentUserId
  const isRecipient = proposal.recipientUserId === currentUserId
  const isPending = proposal.status === 'PENDING'

  const myItems = proposal.items.filter((i) => i.ownerUserId === currentUserId)
  const theirItems = proposal.items.filter((i) => i.ownerUserId !== currentUserId)

  const updateStatus = async (status: string) => {
    setLoading(true)
    await fetch(`/api/trade-proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    onStatusChange()
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Trade Proposal</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[proposal.status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
            {proposal.status}
          </span>
          <span className="text-xs text-zinc-600">{formatDate(proposal.createdAt)}</span>
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Their items (what they're offering) */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">{isProposer ? 'You offer' : 'They offer'}</p>
          <div className="space-y-1.5">
            {theirItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {theirItems.length === 0 && (
              <p className="text-xs text-zinc-600 italic">Nothing</p>
            )}
          </div>
        </div>

        {/* My items (what I'm giving) */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">{isProposer ? 'They give' : 'You give'}</p>
          <div className="space-y-1.5">
            {myItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {myItems.length === 0 && (
              <p className="text-xs text-zinc-600 italic">Nothing</p>
            )}
          </div>
        </div>
      </div>

      {/* Cash adjustment */}
      {proposal.cashAdjustmentAmount !== 0 && (
        <p className="text-xs text-zinc-400">
          Cash adjustment:{' '}
          <span className={proposal.cashAdjustmentAmount > 0 ? 'text-green-400' : 'text-red-400'}>
            {proposal.cashAdjustmentAmount > 0 ? '+' : ''}${proposal.cashAdjustmentAmount.toFixed(2)}
          </span>
          {isRecipient && proposal.cashAdjustmentAmount > 0 && ' (you receive)'}
          {isRecipient && proposal.cashAdjustmentAmount < 0 && ' (you pay)'}
        </p>
      )}

      {/* Note */}
      {proposal.note && (
        <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-2">
          "{proposal.note}"
        </p>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          {isRecipient && (
            <>
              <Button
                size="xs"
                variant="primary"
                loading={loading}
                onClick={() => updateStatus('ACCEPTED')}
                className="gap-1"
              >
                <CheckCircle size={12} /> Accept
              </Button>
              <Button
                size="xs"
                variant="danger"
                loading={loading}
                onClick={() => updateStatus('REJECTED')}
                className="gap-1"
              >
                <XCircle size={12} /> Reject
              </Button>
              <Button
                size="xs"
                variant="outline"
                loading={loading}
                onClick={() => updateStatus('COUNTERED')}
                className="gap-1"
              >
                <RotateCcw size={12} /> Counter
              </Button>
            </>
          )}
          {isProposer && (
            <Button
              size="xs"
              variant="ghost"
              loading={loading}
              onClick={() => updateStatus('CANCELLED')}
              className="gap-1 text-zinc-500"
            >
              <Trash2 size={12} /> Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item }: { item: ProposalItem }) {
  return (
    <div className="flex items-center gap-2">
      {item.inventoryItem.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.inventoryItem.imageUrl}
          alt={item.inventoryItem.cardName}
          className="w-8 h-10 object-cover rounded flex-shrink-0 bg-zinc-800"
        />
      ) : (
        <div className="w-8 h-10 rounded bg-zinc-800 flex-shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs text-zinc-200 truncate">{item.snapshotName ?? item.inventoryItem.cardName}</p>
        <p className="text-xs text-zinc-500">
          ×{item.quantity}
          {item.snapshotValue != null && ` · $${item.snapshotValue.toFixed(2)}`}
        </p>
      </div>
    </div>
  )
}
