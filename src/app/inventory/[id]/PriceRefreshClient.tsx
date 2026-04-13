'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, RefreshCw } from 'lucide-react'
import type { PriceComp } from '@prisma/client'

import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  itemId: string
  initialComps: PriceComp[]
}

export function PriceRefreshClient({ itemId, initialComps }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [comps, setComps] = useState<PriceComp[]>(initialComps)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(
    initialComps.length > 0 ? (initialComps[0].source ?? null) : null,
  )

  const refresh = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/pricing/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Failed to refresh price (${res.status})`)
      }

      setComps(json.data?.comps ?? [])
      setSource(json.data?.source ?? null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh price')
    } finally {
      setLoading(false)
    }
  }

  const sourceLabel = source
    ? source === 'ebay-finding-api' ? 'eBay Finding API'
      : source === 'ebay-html-scrape' ? 'eBay (scraped)'
        : source === 'snkrdunk' ? 'SNKRDUNK'
          : source
    : null

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Last Sold Prices</h2>

        {sourceLabel && (
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600">
            {sourceLabel}
          </span>
        )}

        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching...' : 'Refresh Price'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {comps.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">No sold comps yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Click "Refresh Price" to fetch the last sold listings from eBay or SNKRDUNK.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Title</th>
                <th className="px-4 py-2.5 text-right text-xs text-zinc-500">Sold Price</th>
                <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Condition</th>
                <th className="px-4 py-2.5 text-right text-xs text-zinc-500">Date</th>
                <th className="px-4 py-2.5 text-center text-xs text-zinc-500">Link</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {comps.map((comp) => (
                <tr key={comp.id} className="hover:bg-zinc-800/30">
                  <td className="max-w-xs px-4 py-2.5 text-zinc-300">
                    <span className="line-clamp-2 leading-snug">{comp.title}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-medium text-emerald-400">
                    {formatCurrency(comp.soldPrice)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500">
                    {comp.conditionGuess ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-zinc-500">
                    {comp.soldDate ? formatDate(comp.soldDate) : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {comp.url ? (
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-zinc-600 hover:text-zinc-300"
                      >
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-zinc-700">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
