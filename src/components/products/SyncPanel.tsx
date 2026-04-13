'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'

import { syncAllReleases } from '@/app/actions/releaseSync'
import { cn } from '@/lib/utils'

interface Props {
  lastSyncAt: Date | null
  lastSyncSuccess: boolean | null
}

function fmt(d: Date | null) {
  if (!d) return null
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SyncPanel({ lastSyncAt, lastSyncSuccess }: Props) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const run = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const r = await syncAllReleases()
      setResult({
        ok: true,
        msg: `+${r.totalInserted} new | ${r.totalUpdated} updated | ${r.totalFailed} failed`,
      })
      router.refresh()
    } catch (e) {
      setResult({ ok: false, msg: String(e) })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => void run()}
        disabled={syncing}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
          syncing
            ? 'cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-500'
            : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700',
        )}
      >
        {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {result ? (
        <span className={cn('inline-flex items-center gap-1 text-xs', result.ok ? 'text-emerald-400' : 'text-red-400')}>
          {result.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {result.msg}
        </span>
      ) : lastSyncAt ? (
        <span className={cn('text-xs', lastSyncSuccess === false ? 'text-red-500' : 'text-zinc-600')}>
          Last synced {fmt(lastSyncAt)}
          {lastSyncSuccess === false && ' | failed'}
        </span>
      ) : (
        <span className="text-xs text-zinc-700">Never synced | click Sync Now to load products</span>
      )}
    </div>
  )
}
