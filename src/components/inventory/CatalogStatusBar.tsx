'use client'
import { useState } from 'react'
import { RefreshCw, CheckCircle, Database } from 'lucide-react'
import { syncSports, syncPokemonSet } from '@/app/actions/catalogSync'

interface Stats { total: number; pokemon: number; sports: number; sealed?: number }
interface Props { stats: Stats }

const ALL_SETS = [
  'sv8', 'sv7', 'sv6pt5', 'sv6', 'sv5', 'sv4pt5', 'sv4',
  'sv3pt5', 'sv3', 'sv2', 'sv1',
  'swsh7', 'swsh12', 'swsh9', 'base1',
]

export function CatalogStatusBar({ stats: initialStats }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [phase, setPhase] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const isEmpty = initialStats.total === 0

  const runQuickSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      setPhase('sports')
      const j1 = await syncSports()
      if ('error' in j1) throw new Error(String(j1.error))

      setPhase('pokemon 151')
      const j2 = await syncPokemonSet('sv3pt5')

      const sportsCount  = 'sportsUpserted'    in j1 ? j1.sportsUpserted    : 0
      const boxCount     = 'boxesUpserted'     in j1 ? j1.boxesUpserted     : 0
      const pokemonCount = 'pokemonUpserted'   in j2 ? j2.pokemonUpserted   : 0
      const jpCount      = 'pokemonJpUpserted' in j2 ? j2.pokemonJpUpserted : 0
      setResult(`Synced ${sportsCount} sports + ${boxCount} boxes + ${pokemonCount} EN + ${jpCount} JP Pokémon (151). Refresh to search.`)
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
    let total = 0
    try {
      for (const set of ALL_SETS) {
        setPhase(set)
        const j = await syncPokemonSet(set)
        total += 'pokemonUpserted' in j ? (j.pokemonUpserted as number) : 0
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

  // Compact healthy state — show as collapsible
  if (!isEmpty && initialStats.total >= 20 && !expanded) {
    return (
      <div className="mb-4 flex items-center gap-2 text-xs text-zinc-600">
        <CheckCircle size={12} className="text-emerald-600" />
        <span>
          Catalog: <span className="text-zinc-400">{initialStats.total}</span> cards ({initialStats.pokemon} Pokémon · {initialStats.sports} sports{initialStats.sealed ? ` · ${initialStats.sealed} boxes` : ''})
        </span>
        <button
          onClick={() => setExpanded(true)}
          className="ml-1 text-zinc-600 hover:text-zinc-400 underline underline-offset-2"
        >
          sync
        </button>
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
        <Database size={15} className={isEmpty ? 'text-amber-400 mt-0.5 flex-shrink-0' : 'text-zinc-500 mt-0.5 flex-shrink-0'} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {isEmpty
              ? 'Card catalog is empty — search will not return results'
              : `Catalog: ${initialStats.total} cards (${initialStats.pokemon} Pokémon · ${initialStats.sports} sports${initialStats.sealed ? ` · ${initialStats.sealed} boxes` : ''})`}
          </p>
          {result && (
            <p className="mt-1 text-xs text-zinc-400 break-words">{result}</p>
          )}
          {syncing && phase && (
            <p className="mt-1 text-xs text-zinc-500 animate-pulse">
              Syncing {phase}…
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={runQuickSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={11} className={syncing && (phase === 'sports' || phase === 'pokemon 151') ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Quick Sync (sports + Pokémon 151)'}
            </button>
            <button
              onClick={runFullPokemonSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-600 text-zinc-300 text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Full Pokémon Sync (all {ALL_SETS.length} sets)
            </button>
            {!isEmpty && (
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                hide
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
