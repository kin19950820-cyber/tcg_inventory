'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PriceComp } from '@prisma/client'

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
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Failed to refresh price')
      setComps(json.data?.comps ?? [])
      setSource(json.data?.source ?? null)
      router.refresh()  // re-render server stats (Market Price cell)
    } catch (e) {
      setError(String(e))
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
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Last Sold Prices
        </h2>
        {sourceLabel && (
          <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
            {sourceLabel}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-zinc-700 text-zinc-400 text-xs font-medium hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching…' : 'Refresh Price'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {comps.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">No sold comps yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Click "Refresh Price" to fetch the last 5 sold listings from eBay or SNKRDUNK.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs text-zinc-500">Title</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Sold Price</th>
                <th className="text-left px-4 py-2.5 text-xs text-zinc-500">Condition</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500">Date</th>
                <th className="px-4 py-2.5 text-xs text-zinc-500 text-center">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {comps.map((comp) => (
                <tr key={comp.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-2.5 text-zinc-300 max-w-xs">
                    <span className="line-clamp-2 leading-snug">{comp.title}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-medium whitespace-nowrap">
                    {formatCurrency(comp.soldPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {comp.conditionGuess ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-500 text-xs whitespace-nowrap">
                    {comp.soldDate ? formatDate(comp.soldDate) : '—'}
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
                      <span className="text-zinc-700">—</span>
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
