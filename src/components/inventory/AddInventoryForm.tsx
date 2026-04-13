'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CardSearchInput } from './CardSearchInput'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { syncSports, syncPokemonSet } from '@/app/actions/catalogSync'
import type { CardCatalog } from '@prisma/client'

// ── Option lists ──────────────────────────────────────────────────────────────

type ItemType = 'pokemon' | 'sports' | 'sealed' | 'tcg'

const ITEM_TYPE_OPTIONS: { type: ItemType; label: string }[] = [
  { type: 'pokemon', label: 'Pokemon Card' },
  { type: 'sports', label: 'Basketball / Sports Card' },
  { type: 'sealed', label: 'Box / Sealed Product' },
  { type: 'tcg', label: 'Other TCG Card' },
]

const BOX_TYPES = [
  { value: 'Booster Box', label: 'Booster Box' },
  { value: 'Elite Trainer Box', label: 'Elite Trainer Box (ETB)' },
  { value: 'Blister Pack', label: 'Blister Pack' },
  { value: 'Bundle', label: 'Bundle' },
  { value: 'Collection Box', label: 'Collection Box' },
  { value: 'Tin', label: 'Tin' },
  { value: 'Premium Collection', label: 'Premium Collection' },
  { value: 'Starter Deck', label: 'Starter / Structure Deck' },
  { value: 'Booster Pack', label: 'Booster Pack (Single)' },
  { value: 'Display Box', label: 'Display Box' },
  { value: 'Case', label: 'Case' },
  { value: 'Other', label: 'Other' },
]

const TCG_GAMES = [
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'onepiece', label: 'One Piece TCG' },
  { value: 'lorcana', label: 'Disney Lorcana' },
  { value: 'other', label: 'Other TCG' },
]

const SEALED_PRODUCT_TYPES = [
  { value: 'pokemon', label: 'Pokemon TCG' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'onepiece', label: 'One Piece TCG' },
  { value: 'lorcana', label: 'Disney Lorcana' },
  { value: 'basketball', label: 'Basketball Cards' },
  { value: 'baseball', label: 'Baseball Cards' },
  { value: 'football', label: 'Football Cards' },
  { value: 'soccer', label: 'Soccer Cards' },
  { value: 'other', label: 'Other' },
]

const SEALED_CONDITIONS = [
  { value: 'Sealed', label: 'Factory Sealed' },
  { value: 'Opened', label: 'Opened (Complete)' },
  { value: 'NM', label: 'Near Mint (NM)' },
  { value: 'LP', label: 'Light Play (LP)' },
  { value: 'DMG', label: 'Damaged (DMG)' },
]

const SPORT_OPTIONS = [
  { value: 'Basketball', label: 'Basketball' },
  { value: 'Baseball', label: 'Baseball' },
  { value: 'Football', label: 'American Football' },
  { value: 'Soccer', label: 'Soccer / Football' },
  { value: 'Hockey', label: 'Hockey' },
  { value: 'Tennis', label: 'Tennis' },
  { value: 'F1', label: 'Formula 1' },
  { value: 'Golf', label: 'Golf' },
  { value: 'MMA', label: 'MMA / UFC' },
  { value: 'Other', label: 'Other Sport' },
]

const LEAGUE_BY_SPORT: Record<string, string[]> = {
  Basketball: ['NBA', 'WNBA', 'NCAA', 'G League', 'EuroLeague'],
  Baseball: ['MLB', 'MiLB', 'NPB'],
  Football: ['NFL', 'NCAA', 'CFL'],
  Soccer: ['MLS', 'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Champions League'],
  Hockey: ['NHL', 'AHL'],
  Tennis: ['ATP', 'WTA'],
  F1: ['Formula 1'],
  Other: [],
}

const MANUFACTURER_OPTIONS = [
  { value: 'Panini', label: 'Panini' },
  { value: 'Topps', label: 'Topps / Fanatics' },
  { value: 'Upper Deck', label: 'Upper Deck' },
  { value: 'Leaf', label: 'Leaf' },
  { value: 'Bowman', label: 'Bowman' },
  { value: 'Donruss', label: 'Donruss' },
  { value: 'Fleer', label: 'Fleer' },
  { value: 'Other', label: 'Other' },
]

const LANGUAGES = [
  { value: 'EN', label: 'English' },
  { value: 'JA', label: 'Japanese' },
  { value: 'KO', label: 'Korean' },
  { value: 'ZH', label: 'Chinese' },
  { value: 'DE', label: 'German' },
  { value: 'FR', label: 'French' },
  { value: 'ES', label: 'Spanish' },
  { value: 'IT', label: 'Italian' },
  { value: 'PT', label: 'Portuguese' },
]

const CONDITIONS = [
  { value: '', label: 'Unknown' },
  { value: 'M', label: 'Mint (M)' },
  { value: 'NM', label: 'Near Mint (NM)' },
  { value: 'LP', label: 'Light Play (LP)' },
  { value: 'MP', label: 'Moderate Play (MP)' },
  { value: 'HP', label: 'Heavy Play (HP)' },
  { value: 'DMG', label: 'Damaged (DMG)' },
]

const GRADERS = [
  { value: '', label: 'None (raw)' },
  { value: 'PSA', label: 'PSA' },
  { value: 'BGS', label: 'Beckett (BGS)' },
  { value: 'CGC', label: 'CGC' },
  { value: 'SGC', label: 'SGC' },
  { value: 'ACE', label: 'ACE' },
]

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = {
  itemType: ItemType
  category: 'TCG' | 'SPORTS' | 'SEALED'
  // TCG
  game: string
  cardName: string
  boxType: string
  setName: string
  cardNumber: string
  language: string
  rarity: string
  variant: string
  // Sports
  sport: string
  league: string
  season: string
  manufacturer: string
  brand: string
  productLine: string
  subsetName: string
  insertName: string
  parallel: string
  serialNumbered: boolean
  serialNumber: string
  autograph: boolean
  memorabilia: boolean
  rookie: boolean
  playerName: string
  teamName: string
  year: string
  // Shared
  conditionRaw: string
  gradingCompany: string
  grade: string
  certNumber: string
  quantity: number
  purchasePrice: number
  purchaseDate: string
  fees: number
  shippingCost: number
  source: string
  notes: string
  imageUrl: string
}

const emptyTCG: FormState = {
  itemType: 'pokemon', category: 'TCG', game: 'pokemon', cardName: '', boxType: '', setName: '', cardNumber: '',
  language: 'EN', rarity: '', variant: '',
  sport: '', league: '', season: '', manufacturer: '', brand: '', productLine: '',
  subsetName: '', insertName: '', parallel: '', serialNumbered: false, serialNumber: '',
  autograph: false, memorabilia: false, rookie: false, playerName: '', teamName: '', year: '',
  conditionRaw: 'NM', gradingCompany: '', grade: '', certNumber: '',
  quantity: 1, purchasePrice: 0, purchaseDate: new Date().toISOString().split('T')[0],
  fees: 0, shippingCost: 0, source: '', notes: '', imageUrl: '',
}

const emptySports: FormState = {
  ...emptyTCG,
  itemType: 'sports', category: 'SPORTS', game: 'basketball', sport: 'Basketball', league: 'NBA',
  conditionRaw: 'NM',
}

const emptySealed: FormState = {
  ...emptyTCG,
  itemType: 'sealed', category: 'SEALED', game: 'pokemon', cardName: '', boxType: 'Booster Box', setName: '',
  conditionRaw: 'Sealed', language: 'JA',
}

interface Props {
  onSuccess?: () => void
  initialData?: Partial<FormState>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddInventoryForm({ onSuccess, initialData }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ ...emptyTCG, ...initialData })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardCatalog | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState(0)   // incrementing re-mounts CardSearchInput after sync
  const quantityRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const switchItemType = (type: ItemType) => {
    const shared = { source: form.source, purchaseDate: form.purchaseDate }
    if (type === 'pokemon') setForm({ ...emptyTCG, itemType: 'pokemon', game: 'pokemon', category: 'TCG', ...shared })
    else if (type === 'sports') setForm({ ...emptySports, itemType: 'sports', ...shared })
    else if (type === 'sealed') setForm({ ...emptySealed, itemType: 'sealed', ...shared })
    else setForm({ ...emptyTCG, itemType: 'tcg', game: 'mtg', category: 'TCG', ...shared })
    setSelectedCard(null)
    setError(null)
  }

  // Auto-derive league options from chosen sport
  const leagueOptions = (LEAGUE_BY_SPORT[form.sport] ?? []).map((v) => ({ value: v, label: v }))

  // Auto-derive game for DB storage
  const derivedGame = form.category === 'SPORTS'
    ? (form.sport.toLowerCase() || 'sports')
    : form.game

  const handleCatalogSelect = (card: CardCatalog) => {
    setSelectedCard(card)
    const cardCategory = (card as CardCatalog & { category?: string }).category

    if (cardCategory === 'SEALED') {
      setForm((prev) => ({
        ...emptySealed,
        game: card.game ?? prev.game,
        cardName: card.cardName,
        setName: card.setName ?? '',
        boxType: card.variant ?? prev.boxType,
        imageUrl: card.imageUrl ?? '',
        source: prev.source,
        purchaseDate: prev.purchaseDate,
      }))
      setTimeout(() => quantityRef.current?.focus(), 50)
      return
    }

    if (cardCategory === 'SPORTS') {
      const c = card as CardCatalog & {
        sport?: string; league?: string; season?: string; manufacturer?: string
        brand?: string; productLine?: string; insertName?: string; parallel?: string
        rookie?: boolean; autograph?: boolean; memorabilia?: boolean; serialNumbered?: boolean
        playerName?: string; teamName?: string
      }
      setForm((prev) => ({
        ...prev,
        itemType: 'sports',
        category: 'SPORTS',
        sport: c.sport ?? prev.sport,
        league: c.league ?? prev.league,
        season: c.season ?? '',
        manufacturer: c.manufacturer ?? '',
        brand: c.brand ?? '',
        productLine: c.productLine ?? '',
        insertName: c.insertName ?? '',
        parallel: c.parallel ?? '',
        rookie: c.rookie ?? false,
        autograph: c.autograph ?? false,
        memorabilia: c.memorabilia ?? false,
        serialNumbered: c.serialNumbered ?? false,
        playerName: c.playerName ?? '',
        teamName: c.teamName ?? '',
        cardName: c.playerName ?? card.cardName,
        setName: card.setName ?? '',
        cardNumber: card.cardNumber ?? '',
        imageUrl: card.imageUrl ?? '',
        game: (c.sport ?? 'sports').toLowerCase(),
      }))
    } else {  // TCG card
      const game = card.game ?? 'pokemon'
      setForm((prev) => ({
        ...prev,
        itemType: game === 'pokemon' ? 'pokemon' : 'tcg',
        category: 'TCG',
        game,
        cardName: card.cardName,
        setName: card.setName ?? '',
        cardNumber: card.cardNumber ?? '',
        language: card.language ?? 'EN',
        rarity: card.rarity ?? '',
        variant: card.variant ?? '',
        imageUrl: card.imageUrl ?? '',
      }))
    }
    setTimeout(() => quantityRef.current?.focus(), 50)
  }

  // Inline catalog sync for sports / sealed modes
  const handleQuickSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      if (form.itemType === 'sports' || form.itemType === 'sealed') {
        const result = await syncSports()  // syncs both sports cards + box catalog
        const s = 'sportsUpserted' in result ? result.sportsUpserted ?? 0 : 0
        const b = 'boxesUpserted'  in result ? result.boxesUpserted  ?? 0 : 0
        setSyncMsg(`Synced: ${s} sports cards + ${b} box products`)
      } else {
        const result = await syncPokemonSet('sv3pt5')
        const p = 'pokemonUpserted' in result ? result.pokemonUpserted ?? 0 : 0
        setSyncMsg(`Synced: ${p} Pokémon cards (151 set)`)
      }
      setSearchKey((k) => k + 1)  // remount search input to reload top results
    } catch (e) {
      setSyncMsg(`Error: ${String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  const totalCost = form.purchasePrice * form.quantity + form.fees + form.shippingCost
  const isGraded = !!form.gradingCompany

  const handleSubmit = async (e: React.FormEvent, addAnother = false) => {
    e.preventDefault()
    const displayName = form.itemType === 'sports' ? form.playerName : form.cardName
    if (!displayName) {
      setError(form.itemType === 'sports' ? 'Player name is required' : form.itemType === 'sealed' ? 'Box name is required' : 'Card name is required')
      return
    }
    if (form.purchasePrice < 0) { setError('Purchase price must be non-negative'); return }

    setLoading(true)
    setError(null)

    try {
      const cardName = form.itemType === 'sports' ? (form.playerName || form.cardName) : form.cardName
      const payload: Record<string, unknown> = {
        category: form.category,
        game: form.itemType === 'sealed' ? form.game : derivedGame,
        cardName,
        setName: form.setName || undefined,
        cardNumber: form.cardNumber || undefined,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        purchaseDate: form.purchaseDate,
        fees: Number(form.fees),
        shippingCost: Number(form.shippingCost),
        source: form.source || undefined,
        notes: form.notes || undefined,
        imageUrl: form.imageUrl || undefined,
        gradingCompany: form.gradingCompany || undefined,
        grade: form.grade || undefined,
        certNumber: form.certNumber || undefined,
      }

      if (form.itemType === 'sealed') {
        payload.conditionRaw = form.conditionRaw || undefined
        payload.setName = form.setName || undefined
        payload.variant = form.boxType || undefined   // store box type in variant field
        payload.language = form.language
      } else if (form.itemType !== 'sports') {
        // TCG (pokemon or other tcg)
        payload.language = form.language
        payload.rarity = form.rarity || undefined
        payload.variant = form.variant || undefined
        payload.conditionRaw = form.conditionRaw || undefined
      } else {
        // Sports
        payload.sport = form.sport || undefined
        payload.league = form.league || undefined
        payload.season = form.season || undefined
        payload.manufacturer = form.manufacturer || undefined
        payload.brand = form.brand || undefined
        payload.productLine = form.productLine || undefined
        payload.subsetName = form.subsetName || undefined
        payload.insertName = form.insertName || undefined
        payload.parallel = form.parallel || undefined
        payload.serialNumbered = form.serialNumbered
        payload.serialNumber = form.serialNumber || undefined
        payload.autograph = form.autograph
        payload.memorabilia = form.memorabilia
        payload.rookie = form.rookie
        payload.playerName = form.playerName || undefined
        payload.teamName = form.teamName || undefined
        payload.year = form.year ? parseInt(form.year) : undefined
        payload.conditionRaw = form.conditionRaw || undefined
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed to save')

      if (addAnother) {
        const reset = form.itemType === 'sports'
          ? { ...emptySports, sport: form.sport, league: form.league, manufacturer: form.manufacturer, source: form.source }
          : form.itemType === 'sealed'
          ? { ...emptySealed, game: form.game, source: form.source }
          : { ...emptyTCG, itemType: form.itemType, game: form.game, language: form.language, source: form.source }
        setForm(reset)
        setSelectedCard(null)
        setError(null)
      } else {
        onSuccess?.()
        router.push('/inventory')
        router.refresh()
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
      {/* ── Item type selector ──────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">What are you adding?</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ITEM_TYPE_OPTIONS.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => switchItemType(type)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-center ${
                form.itemType === type
                  ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick search ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Quick Search</p>
        <CardSearchInput
          key={`${form.itemType === 'sports' ? 'sports' : form.itemType === 'sealed' ? 'sealed' : 'cards'}-${searchKey}`}
          onSelect={handleCatalogSelect}
          autoFocus
          category={
            form.itemType === 'sports' ? 'SPORTS'
            : form.itemType === 'sealed' ? 'SEALED'
            : undefined
          }
          topLimit={form.itemType === 'sports' || form.itemType === 'sealed' ? 20 : 8}
          onSync={form.itemType === 'sports' || form.itemType === 'sealed' ? handleQuickSync : undefined}
          syncing={syncing}
          placeholder={
            form.itemType === 'sports'
              ? 'Search — try "wemby prizm silver" or "caitlin clark chrome"'
              : form.itemType === 'sealed'
              ? 'Search — try "obsidian flames booster box" or "scarlet violet ETB"'
              : 'Search — try "charizard 151" or "umbreon alt art"'
          }
        />
        {syncMsg && (
          <p className="mt-1.5 text-xs text-emerald-500">{syncMsg} — start typing to search</p>
        )}
        {selectedCard && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
            <span>✓ Auto-filled from catalog</span>
            <button type="button" onClick={() => setSelectedCard(null)} className="text-zinc-500 hover:text-zinc-300">
              clear
            </button>
          </div>
        )}
      </div>

      <hr className="border-zinc-800" />

      {/* ── TCG fields (Pokemon / Other TCG) ────────────────────────────── */}
      {(form.itemType === 'pokemon' || form.itemType === 'tcg') && (
        <>
          {form.itemType === 'tcg' && (
            <div className="grid grid-cols-[160px_1fr] gap-3">
              <Select label="Game" options={TCG_GAMES} value={form.game} onChange={(e) => set('game', e.target.value)} />
              <Input label="Card Name *" value={form.cardName} onChange={(e) => set('cardName', e.target.value)} placeholder="e.g. Black Lotus" required />
            </div>
          )}
          {form.itemType === 'pokemon' && (
            <Input label="Card Name *" value={form.cardName} onChange={(e) => set('cardName', e.target.value)} placeholder="e.g. Charizard ex" required />
          )}

          <div className="grid grid-cols-[1fr_100px_120px] gap-3">
            <Input label="Set Name" value={form.setName} onChange={(e) => set('setName', e.target.value)} placeholder="e.g. Obsidian Flames" />
            <Input
              label="Card #"
              value={form.cardNumber}
              onChange={(e) => set('cardNumber', e.target.value)}
              placeholder={form.language === 'JA' ? 'JP #' : '228'}
            />
            <Select
              label="Language"
              options={LANGUAGES}
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
            />
          </div>

          {/* JP card number warning — JP numbers differ from EN */}
          {form.language === 'JA' && form.cardNumber.startsWith('JP-') && (
            <div className="rounded-md border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
              JP card numbers differ from EN. The catalog entry uses a placeholder (<span className="font-mono">{form.cardNumber}</span>).
              Please update the card number to the correct Japanese number before saving
              (e.g. <span className="font-mono">006/165</span> for Charizard ex in 黒炎の支配者).
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Rarity" value={form.rarity} onChange={(e) => set('rarity', e.target.value)} placeholder="e.g. Special Illustration Rare" />
            <Input label="Variant" value={form.variant} onChange={(e) => set('variant', e.target.value)} placeholder="e.g. Alternate Art, Shadowless" />
          </div>
        </>
      )}

      {/* ── Box / Sealed Product fields ──────────────────────────────────── */}
      {form.itemType === 'sealed' && (
        <>
          <div className="grid grid-cols-[180px_1fr] gap-3">
            <Select
              label="Game / Sport"
              options={SEALED_PRODUCT_TYPES}
              value={form.game}
              onChange={(e) => set('game', e.target.value)}
            />
            <Select
              label="Box Type"
              options={BOX_TYPES}
              value={form.boxType}
              onChange={(e) => set('boxType', e.target.value)}
            />
          </div>

          <Input
            label="Name *"
            value={form.cardName}
            onChange={(e) => set('cardName', e.target.value)}
            placeholder="e.g. Scarlet & Violet — Obsidian Flames Booster Box"
            required
          />

          <div className="grid grid-cols-[1fr_120px_160px] gap-3">
            <Input
              label="Set / Edition"
              value={form.setName}
              onChange={(e) => set('setName', e.target.value)}
              placeholder="e.g. Obsidian Flames, Paradox Rift"
            />
            <Select
              label="Language"
              options={LANGUAGES}
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
            />
            <Select
              label="Condition"
              options={SEALED_CONDITIONS}
              value={form.conditionRaw}
              onChange={(e) => set('conditionRaw', e.target.value)}
            />
          </div>
        </>
      )}

      {/* ── Sports fields ────────────────────────────────────────────────── */}
      {form.itemType === 'sports' && (
        <>
          {/* Sport + League */}
          <div className="grid grid-cols-[160px_1fr] gap-3">
            <Select
              label="Sport"
              options={SPORT_OPTIONS}
              value={form.sport}
              onChange={(e) => { set('sport', e.target.value); set('league', '') }}
            />
            {leagueOptions.length > 0 ? (
              <Select
                label="League"
                options={[{ value: '', label: 'Select…' }, ...leagueOptions]}
                value={form.league}
                onChange={(e) => set('league', e.target.value)}
              />
            ) : (
              <Input label="League" value={form.league} onChange={(e) => set('league', e.target.value)} placeholder="e.g. NBA" />
            )}
          </div>

          {/* Manufacturer + Brand + Season */}
          <div className="grid grid-cols-[160px_1fr_120px] gap-3">
            <Select label="Manufacturer" options={[{ value: '', label: 'Select…' }, ...MANUFACTURER_OPTIONS]} value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
            <Input label="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Prizm, Select, Chrome" />
            <Input label="Season / Year" value={form.season} onChange={(e) => set('season', e.target.value)} placeholder="2024-25" />
          </div>

          {/* Product Name */}
          <Input
            label="Product Name (Set)"
            value={form.setName}
            onChange={(e) => set('setName', e.target.value)}
            placeholder="e.g. 2024-25 Panini Prizm Basketball"
            hint="Full product name as it appears on the box"
          />

          {/* Player + Team + Card # */}
          <div className="grid grid-cols-[1fr_160px_100px] gap-3">
            <Input label="Player Name *" value={form.playerName} onChange={(e) => set('playerName', e.target.value)} placeholder="e.g. Victor Wembanyama" required />
            <Input label="Team" value={form.teamName} onChange={(e) => set('teamName', e.target.value)} placeholder="e.g. Spurs" />
            <Input label="Card #" value={form.cardNumber} onChange={(e) => set('cardNumber', e.target.value)} placeholder="1" />
          </div>

          {/* Parallel + Insert */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Parallel" value={form.parallel} onChange={(e) => set('parallel', e.target.value)} placeholder="e.g. Silver Prizm, Gold /10" />
            <Input label="Insert / Subset" value={form.insertName} onChange={(e) => set('insertName', e.target.value)} placeholder="e.g. Mosaic, Draft Picks" />
          </div>

          {/* Boolean flags */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'rookie' as const, label: 'RC (Rookie Card)', color: 'amber' },
              { key: 'autograph' as const, label: 'Autograph', color: 'purple' },
              { key: 'memorabilia' as const, label: 'Patch / Mem.', color: 'blue' },
              { key: 'serialNumbered' as const, label: 'Serial Numbered', color: 'zinc' },
            ]).map(({ key, label, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => set(key, !form[key])}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                  form[key]
                    ? color === 'amber' ? 'border-amber-600 bg-amber-900/40 text-amber-300'
                    : color === 'purple' ? 'border-purple-600 bg-purple-900/40 text-purple-300'
                    : color === 'blue' ? 'border-blue-600 bg-blue-900/40 text-blue-300'
                    : 'border-zinc-600 bg-zinc-700/40 text-zinc-200'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {form[key] ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>

          {/* Serial number (only if serialNumbered) */}
          {form.serialNumbered && (
            <Input
              label="Serial Number"
              value={form.serialNumber}
              onChange={(e) => set('serialNumber', e.target.value)}
              placeholder="e.g. 42/99"
            />
          )}
        </>
      )}

      {/* ── Condition / grading (shared) ─────────────────────────────────── */}
      <hr className="border-zinc-800" />

      {form.itemType === 'sealed' ? (
        <div className="grid grid-cols-[1fr_160px] gap-3">
          <Input label="Source / Platform" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="eBay, TCGPlayer, LCS…" />
          <Input label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes…" />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_1fr_120px_160px] gap-3">
          <Select label="Grading Company" options={GRADERS} value={form.gradingCompany} onChange={(e) => set('gradingCompany', e.target.value)} />
          {isGraded ? (
            <Input label="Grade" value={form.grade} onChange={(e) => set('grade', e.target.value)} placeholder="10" />
          ) : (
            <Select label="Condition" options={CONDITIONS} value={form.conditionRaw} onChange={(e) => set('conditionRaw', e.target.value)} />
          )}
          <Input label="Cert #" value={form.certNumber} onChange={(e) => set('certNumber', e.target.value)} placeholder="12345678" disabled={!isGraded} />
          <Input label="Source / Platform" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="eBay, COMC, LCS…" />
        </div>
      )}

      {/* ── Pricing (shared) ─────────────────────────────────────────────── */}
      <hr className="border-zinc-800" />

      <div className="grid grid-cols-[80px_160px_110px_110px_120px] gap-3 items-end">
        <Input
          ref={quantityRef}
          label="Qty *"
          type="number"
          min={1}
          value={form.quantity}
          onChange={(e) => set('quantity', parseInt(e.target.value) || 1)}
        />
        <Input
          label="Purchase Price *"
          type="number"
          min={0}
          step={0.01}
          prefix="$"
          value={form.purchasePrice}
          onChange={(e) => set('purchasePrice', parseFloat(e.target.value) || 0)}
        />
        <Input
          label="Fees"
          type="number"
          min={0}
          step={0.01}
          prefix="$"
          value={form.fees}
          onChange={(e) => set('fees', parseFloat(e.target.value) || 0)}
        />
        <Input
          label="Shipping"
          type="number"
          min={0}
          step={0.01}
          prefix="$"
          value={form.shippingCost}
          onChange={(e) => set('shippingCost', parseFloat(e.target.value) || 0)}
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Total Cost</span>
          <div className="h-9 flex items-center px-3 rounded-md bg-zinc-800 text-zinc-200 text-sm font-mono">
            {formatCurrency(totalCost)}
          </div>
        </div>
      </div>

      {/* ── Date + Notes ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[160px_1fr] gap-3">
        <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
        {form.itemType !== 'sealed' && (
          <Input label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes…" />
        )}
      </div>

      <Input
        label="Image URL (optional override)"
        value={form.imageUrl}
        onChange={(e) => set('imageUrl', e.target.value)}
        placeholder="https://…"
        hint="Leave blank to auto-resolve"
      />

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {form.itemType === 'sealed' ? 'Save Box' : 'Save Card'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
        >
          Save + Add Another
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
