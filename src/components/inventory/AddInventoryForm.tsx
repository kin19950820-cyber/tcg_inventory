'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CardSearchInput } from './CardSearchInput'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import type { CardCatalog } from '@prisma/client'

const GAMES = [
  { value: 'pokemon', label: 'Pokemon' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'onepiece', label: 'One Piece TCG' },
  { value: 'lorcana', label: 'Disney Lorcana' },
  { value: 'other', label: 'Other' },
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

type FormState = {
  game: string
  cardName: string
  setName: string
  cardNumber: string
  language: string
  rarity: string
  variant: string
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

const empty: FormState = {
  game: 'pokemon', cardName: '', setName: '', cardNumber: '', language: 'EN',
  rarity: '', variant: '', conditionRaw: 'NM', gradingCompany: '', grade: '',
  certNumber: '', quantity: 1, purchasePrice: 0, purchaseDate: new Date().toISOString().split('T')[0],
  fees: 0, shippingCost: 0, source: '', notes: '', imageUrl: '',
}

interface Props {
  onSuccess?: () => void
  initialData?: Partial<FormState>
}

export function AddInventoryForm({ onSuccess, initialData }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ ...empty, ...initialData })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardCatalog | null>(null)
  const quantityRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof FormState, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleCatalogSelect = (card: CardCatalog) => {
    setSelectedCard(card)
    setForm((prev) => ({
      ...prev,
      game: card.game,
      cardName: card.cardName,
      setName: card.setName ?? '',
      cardNumber: card.cardNumber ?? '',
      language: card.language ?? 'EN',
      rarity: card.rarity ?? '',
      variant: card.variant ?? '',
      imageUrl: card.imageUrl ?? '',
    }))
    setTimeout(() => quantityRef.current?.focus(), 50)
  }

  const totalCost = form.purchasePrice * form.quantity + form.fees + form.shippingCost

  const handleSubmit = async (e: React.FormEvent, addAnother = false) => {
    e.preventDefault()
    if (!form.cardName) { setError('Card name is required'); return }
    if (form.purchasePrice < 0) { setError('Purchase price must be non-negative'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          purchasePrice: Number(form.purchasePrice),
          fees: Number(form.fees),
          shippingCost: Number(form.shippingCost),
          imageUrl: form.imageUrl || undefined,
          gradingCompany: form.gradingCompany || undefined,
          grade: form.grade || undefined,
          certNumber: form.certNumber || undefined,
          conditionRaw: form.conditionRaw || undefined,
          setName: form.setName || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed to save')

      if (addAnother) {
        setForm({ ...empty, game: form.game, language: form.language, source: form.source })
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

  const isGraded = !!form.gradingCompany

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
      {/* Fuzzy search */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Quick Search</p>
        <CardSearchInput onSelect={handleCatalogSelect} autoFocus />
        {selectedCard && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
            <span>✓ Auto-filled from catalog</span>
            <button type="button" onClick={() => setSelectedCard(null)} className="text-zinc-500 hover:text-zinc-300">clear</button>
          </div>
        )}
      </div>

      <hr className="border-zinc-800" />

      {/* Row 1: Game + Name */}
      <div className="grid grid-cols-[140px_1fr] gap-3">
        <Select label="Game" options={GAMES} value={form.game} onChange={(e) => set('game', e.target.value)} />
        <Input label="Card Name *" value={form.cardName} onChange={(e) => set('cardName', e.target.value)} placeholder="e.g. Charizard ex" required />
      </div>

      {/* Row 2: Set + Number + Language */}
      <div className="grid grid-cols-[1fr_100px_120px] gap-3">
        <Input label="Set Name" value={form.setName} onChange={(e) => set('setName', e.target.value)} placeholder="e.g. Obsidian Flames" />
        <Input label="Card #" value={form.cardNumber} onChange={(e) => set('cardNumber', e.target.value)} placeholder="228" />
        <Select label="Language" options={LANGUAGES} value={form.language} onChange={(e) => set('language', e.target.value)} />
      </div>

      {/* Row 3: Rarity + Variant */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Rarity" value={form.rarity} onChange={(e) => set('rarity', e.target.value)} placeholder="e.g. Special Illustration Rare" />
        <Input label="Variant" value={form.variant} onChange={(e) => set('variant', e.target.value)} placeholder="e.g. Alternate Art, Shadowless" />
      </div>

      {/* Row 4: Condition / Grading */}
      <div className="grid grid-cols-[1fr_1fr_120px_160px] gap-3">
        <Select label="Grading Company" options={GRADERS} value={form.gradingCompany} onChange={(e) => set('gradingCompany', e.target.value)} />
        {isGraded ? (
          <Input label="Grade" value={form.grade} onChange={(e) => set('grade', e.target.value)} placeholder="10" />
        ) : (
          <Select label="Condition" options={CONDITIONS} value={form.conditionRaw} onChange={(e) => set('conditionRaw', e.target.value)} />
        )}
        <Input label="Cert #" value={form.certNumber} onChange={(e) => set('certNumber', e.target.value)} placeholder="12345678" disabled={!isGraded} />
        <Input label="Source / Platform" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="eBay, TCGPlayer…" />
      </div>

      <hr className="border-zinc-800" />

      {/* Row 5: Pricing */}
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

      {/* Row 6: Date + Notes */}
      <div className="grid grid-cols-[160px_1fr] gap-3">
        <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
        <Input label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes…" />
      </div>

      {/* Image URL override */}
      <Input
        label="Image URL (optional override)"
        value={form.imageUrl}
        onChange={(e) => set('imageUrl', e.target.value)}
        placeholder="https://…"
        hint="Leave blank to auto-resolve from catalog or PSA"
      />

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={loading}>Save Card</Button>
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
