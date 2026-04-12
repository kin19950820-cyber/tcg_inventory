'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardCatalog } from '@prisma/client'

interface Props {
  onSelect: (card: CardCatalog) => void
  placeholder?: string
  autoFocus?: boolean
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

  // Pre-fetch top results once on mount so focus feels instant
  useEffect(() => {
    fetch('/api/catalog/search?top=1&limit=8')
      .then((r) => r.json())
      .then((j) => setTopResults(j.results ?? []))
      .catch(() => {})
  }, [])

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}&limit=12`)
      const json = await res.json()
      setResults(json.results ?? [])
      setCursor(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchResults(debouncedQuery) }, [debouncedQuery, fetchResults])

  const handleFocus = () => {
    setOpen(true)
    setCursor(-1)
  }

  // Use mousedown on the container so blur fires after we've processed the click
  const handleBlur = () => {
    // Small delay lets onMouseDown on a list item fire before we close
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        setOpen(false)
        setCursor(-1)
      }
    }, 150)
  }

  const handleSelect = (card: CardCatalog) => {
    setQuery('')
    setResults([])
    setOpen(false)
    setCursor(-1)
    onSelect(card)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, displayResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, -1))
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault()
      handleSelect(displayResults[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setCursor(-1)
    }
  }

  // Scroll cursor into view
  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const el = listRef.current.children[cursor] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [cursor])

  const showDropdown = open && displayResults.length > 0
  const showEmpty = open && query.length >= 2 && results.length === 0 && !loading

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 text-zinc-500 pointer-events-none" />
        {loading && (
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

      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        >
          {query.length < 2 && (
            <li className="px-3 py-1.5 text-xs text-zinc-600 border-b border-zinc-800 select-none">
              Popular cards — start typing to search
            </li>
          )}
          {displayResults.map((card, i) => {
            const c = card as typeof card & {
              category?: string; sport?: string; playerName?: string
              brand?: string; season?: string; parallel?: string
              teamName?: string; rookie?: boolean; autograph?: boolean
            }
            const isSports = c.category === 'SPORTS'
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
                    {c.rookie && (
                      <span className="text-xs text-amber-400 font-bold flex-shrink-0">RC</span>
                    )}
                    {c.autograph && (
                      <span className="text-xs text-purple-400 flex-shrink-0">AUTO</span>
                    )}
                  </div>
                  {isSports ? (
                    <p className="text-xs text-zinc-500 truncate">
                      {[c.season, c.brand, c.parallel].filter(Boolean).join(' · ')}
                      {c.teamName && (
                        <span className="ml-1 text-zinc-600">· {c.teamName}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 truncate">
                      {[
                        card.setName,
                        card.cardNumber && `#${card.cardNumber}`,
                        card.variant,
                        card.language !== 'EN' && card.language,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {!isSports && card.rarity && (
                    <p className="text-xs text-zinc-600 truncate">{card.rarity}</p>
                  )}
                  {isSports && (
                    <p className="text-xs text-zinc-600 truncate">{card.setName}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-700 flex-shrink-0">
                  {isSports ? 'SPORTS' : card.game?.toUpperCase()}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {showEmpty && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 px-4 py-3 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-500 shadow-2xl">
          No results for &quot;{query}&quot; — fill in details manually below
        </div>
      )}
    </div>
  )
}
