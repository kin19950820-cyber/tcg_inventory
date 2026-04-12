'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardCatalog } from '@prisma/client'

interface Props {
  onSelect: (card: CardCatalog) => void
  placeholder?: string
  autoFocus?: boolean
  /** Restricts results to this catalog category, e.g. "SPORTS" or "SEALED" */
  category?: string
  /** How many items to show on focus before typing. Default 8. */
  topLimit?: number
  /** If provided, a "Sync catalog" button appears in the empty-state panel. */
  onSync?: () => void
  /** Shows a spinner on the sync button while true. */
  syncing?: boolean
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function CardSearchInput({
  onSelect,
  placeholder = 'Search cards — try "charizard 151" or "mew ex"',
  autoFocus,
  category,
  topLimit = 8,
  onSync,
  syncing,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardCatalog[]>([])
  const [topResults, setTopResults] = useState<CardCatalog[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 160)

  // Displayed list: typed results take priority; fall back to top cards
  const displayResults = query.length >= 2 ? results : topResults

  // Pre-fetch top results on mount. category and topLimit are stable per mount —
  // the parent resets this component via key when they change.
  useEffect(() => {
    const catParam = category ? `&category=${encodeURIComponent(category)}` : ''
    fetch(`/api/catalog/search?top=1&limit=${topLimit}${catParam}`)
      .then((r) => r.json())
      .then((j) => setTopResults(j.results ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const catParam = category ? `&category=${encodeURIComponent(category)}` : ''
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}&limit=20${catParam}`)
      const json = await res.json()
      setResults(json.results ?? [])
      setCursor(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchResults(debouncedQuery) }, [debouncedQuery, fetchResults])

  const handleFocus = () => { setOpen(true); setCursor(-1) }

  const handleBlur = () => {
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        setOpen(false); setCursor(-1)
      }
    }, 150)
  }

  const handleSelect = (card: CardCatalog) => {
    setQuery(''); setResults([]); setOpen(false); setCursor(-1)
    onSelect(card)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setCursor((c) => Math.min(c + 1, displayResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setCursor((c) => Math.max(c - 1, -1))
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault(); handleSelect(displayResults[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false); setCursor(-1)
    }
  }

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const el = listRef.current.children[cursor] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [cursor])

  const showDropdown    = open && displayResults.length > 0
  const showEmptyFocus  = open && query.length < 2  && topResults.length === 0 && !loading
  const showEmptySearch = open && query.length >= 2 && results.length === 0    && !loading

  // ── Empty state panel (shared between focus-empty and search-empty) ──────────
  const emptyLabel = category === 'SPORTS' ? 'sports cards'
                   : category === 'SEALED' ? 'box products'
                   : 'cards'

  const EmptyPanel = ({ typed }: { typed: boolean }) => (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
      <div className="px-4 py-4 text-center">
        {typed ? (
          <p className="text-sm text-zinc-500 mb-1">
            No {emptyLabel} found for &ldquo;{query}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-zinc-500 mb-1">
            No {emptyLabel} in catalog yet
          </p>
        )}
        {onSync ? (
          <>
            <p className="text-xs text-zinc-600 mb-3">
              Sync the catalog to populate search results
            </p>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSync() }}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : `Sync ${emptyLabel}`}
            </button>
          </>
        ) : (
          <p className="text-xs text-zinc-600">
            {typed ? 'Fill in details manually below' : 'Use the Sync button above to load catalog data'}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 text-zinc-500 pointer-events-none" />
        {(loading || syncing) && (
          <Loader2 size={14} className="absolute right-3 text-zinc-500 animate-spin pointer-events-none" />
        )}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-9 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        >
          {query.length < 2 && (
            <li className="px-3 py-1.5 text-xs text-zinc-600 border-b border-zinc-800 select-none">
              {category === 'SPORTS' ? 'Popular sports cards' : category === 'SEALED' ? 'Popular box products' : 'Popular cards'} — start typing to search
            </li>
          )}
          {displayResults.map((card, i) => {
            const c = card as typeof card & {
              category?: string; sport?: string; playerName?: string
              brand?: string; season?: string; parallel?: string
              teamName?: string; rookie?: boolean; autograph?: boolean
            }
            const isSports = c.category === 'SPORTS'
            const isSealed = c.category === 'SEALED'
            return (
              <li
                key={card.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(card) }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                  i === cursor ? 'bg-brand-600/30 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800'
                )}
              >
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.cardName}
                    className="w-8 h-11 object-contain rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-11 rounded bg-zinc-800 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">
                      {isSports ? (c.playerName ?? card.cardName) : card.cardName}
                    </p>
                    {c.rookie && <span className="text-xs text-amber-400 font-bold flex-shrink-0">RC</span>}
                    {c.autograph && <span className="text-xs text-purple-400 flex-shrink-0">AUTO</span>}
                  </div>
                  {isSealed ? (
                    <p className="text-xs text-zinc-500 truncate">
                      {[card.setName, card.variant].filter(Boolean).join(' · ')}
                    </p>
                  ) : isSports ? (
                    <p className="text-xs text-zinc-500 truncate">
                      {[c.season, c.brand, c.parallel].filter(Boolean).join(' · ')}
                      {c.teamName && <span className="ml-1 text-zinc-600">· {c.teamName}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 truncate">
                      {[card.setName, card.cardNumber && `#${card.cardNumber}`, card.variant, card.language !== 'EN' && card.language]
                        .filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {!isSports && !isSealed && card.rarity && (
                    <p className="text-xs text-zinc-600 truncate">{card.rarity}</p>
                  )}
                  {isSports && (
                    <p className="text-xs text-zinc-600 truncate">{card.setName}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-700 flex-shrink-0">
                  {isSealed ? (c.variant ?? 'BOX') : isSports ? 'SPORTS' : card.game?.toUpperCase()}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Empty state: focused but catalog has no entries for this category */}
      {showEmptyFocus && <EmptyPanel typed={false} />}

      {/* Empty state: typed a query but no results */}
      {showEmptySearch && <EmptyPanel typed={true} />}
    </div>
  )
}
