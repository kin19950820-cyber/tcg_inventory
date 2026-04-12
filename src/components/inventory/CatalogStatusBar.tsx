'use client'
import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

interface Stats { total: number; pokemon: number; sports: number }

interface Props { stats: Stats }

export function CatalogStatusBar({ stats }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [phase, setPhase] = useState<'sports' | 'pokemon' | null>(null)

  const isEmpty = stats.total === 0

  const runSync = async () => {
    setSyncing(true)
    setResult(null)

    try {
      // Step 1: sports sync (fast, Hobby-safe)
      setPhase('sports')
      const s1 = await fetch('/api/catalog/sync?mode=sports', { method: 'POST' })
      const j1 = await s1.json()
      if (j1.status === 'error') throw new Error(j1.error)

      // Step 2: sync most recent Pokemon set (fast, Hobby-safe)
      setPhase('pokemon')
      const s2 = await fetch('/api/catalog/sync?set=sv3pt5', { method: 'POST' }) // 151 set
      const j2 = await s2.json()

      const sportsCount = j1.sportsUpserted ?? 0
      const pokemonCount = j2.pokemonUpserted ?? 0
      setResult(`Synced: ${sportsCount} sports cards + ${pokemonCount} Pokemon cards (151 set). Refresh to search.`)
    } catch (err) {
      setResult(`Error: ${String(err)}`)
    } finally {
      setSyncing(false)
      setPhase(null)
    }
  }

  const runFullPokemonSync = async () => {
    setSyncing(true)
    setResult(null)
    setPhase('pokemon')
    // Hardcoded set list — keep in sync with pokemonTcgScraper.ts
    const sets = [
      'sv8', 'sv7', 'sv6pt5', 'sv6', 'sv5', 'sv4pt5', 'sv4',
      'sv3pt5', 'sv3', 'sv2', 'sv1',
      'swsh7', 'swsh12', 'swsh9', 'base1',
    ]
    let total = 0
    try {
      for (const set of sets) {
        const res = await fetch(`/api/catalog/sync?set=${set}`, { method: 'POST' })
        const j = await res.json()
        total += j.pokemonUpserted ?? 0
        setResult(`Syncing… ${total} Pokémon cards so far (${set} done)`)
      }
      setResult(`Full Pokémon sync complete: ${total} cards. Refresh page to search.`)
    } catch (err) {
      setResult(`Error after ${total} cards: ${String(err)}`)
    } finally {
      setSyncing(false)
      setPhase(null)
    }
  }

  if (!isEmpty && stats.total >= 20) {
    // Compact healthy state
    return (
      <div className="mb-4 flex items-center gap-2 text-xs text-zinc-600">
        <CheckCircle size={12} className="text-emerald-600" />
        <span>Catalog: <span className="text-zinc-400">{stats.total}</span> cards ({stats.pokemon} Pokémon · {stats.sports} sports)</span>
      </div>
    )
  }

  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
      isEmpty
        ? 'border-amber-800 bg-amber-950/30 text-amber-300'
        : 'border-zinc-700 bg-zinc-900/60 text-zinc-400'
    }`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className={isEmpty ? 'text-amber-400 mt-0.5 flex-shrink-0' : 'text-zinc-600 mt-0.5 flex-shrink-0'} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {isEmpty
              ? 'Card catalog is empty — search will not return results'
              : `Catalog has ${stats.total} card${stats.total !== 1 ? 's' : ''} (${stats.pokemon} Pokémon · ${stats.sports} sports)`}
          </p>
          {result && (
            <p className="mt-1 text-xs text-zinc-400 break-words">{result}</p>
          )}
          {syncing && (
            <p className="mt-1 text-xs text-zinc-500 animate-pulse">
              {phase === 'sports' ? 'Syncing sports cards…' : 'Fetching Pokémon cards from pokemontcg.io…'}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={runSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Quick Sync (sports + Pokémon 151)'}
            </button>
            <button
              onClick={runFullPokemonSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-600 text-zinc-300 text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Full Pokémon Sync (~5 min, all {15} sets)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
