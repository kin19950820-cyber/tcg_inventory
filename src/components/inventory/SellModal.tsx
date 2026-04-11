'use client'
import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { formatCurrency, pnlColor, pnlSign } from '@/lib/utils'
import type { InventoryItemWithStats } from '@/types'

const PLATFORMS = [
  { value: '', label: 'Select platform…' },
  { value: 'eBay', label: 'eBay' },
  { value: 'TCGPlayer', label: 'TCGPlayer' },
  { value: 'Facebook', label: 'Facebook Marketplace' },
  { value: 'Local', label: 'Local Sale' },
  { value: 'Other', label: 'Other' },
]

interface Props {
  item: InventoryItemWithStats
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SellModal({ item, open, onClose, onSuccess }: Props) {
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState(item.effectivePrice ?? 0)
  const [totalPrice, setTotalPrice] = useState((item.effectivePrice ?? 0) * 1)
  const [fees, setFees] = useState(0)
  const [shipping, setShipping] = useState(0)
  const [tax, setTax] = useState(0)
  const [platform, setPlatform] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [lastEdited, setLastEdited] = useState<'unit' | 'total'>('unit')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync unit ↔ total
  const handleUnitChange = (v: number) => {
    setUnitPrice(v)
    setTotalPrice(v * qty)
    setLastEdited('unit')
  }

  const handleTotalChange = (v: number) => {
    setTotalPrice(v)
    setUnitPrice(qty > 0 ? v / qty : 0)
    setLastEdited('total')
  }

  const handleQtyChange = (v: number) => {
    const safe = Math.max(1, Math.min(v, item.quantity))
    setQty(safe)
    if (lastEdited === 'unit') setTotalPrice(unitPrice * safe)
    else setUnitPrice(totalPrice / safe)
  }

  // Derived P&L preview
  const grossSale = unitPrice * qty
  const totalFees = fees + shipping + tax
  const netProceeds = grossSale - totalFees
  const costBasisSold = item.weightedAvgCost * qty
  const realizedPnL = netProceeds - costBasisSold
  const remaining = item.quantity - qty

  useEffect(() => {
    if (open) {
      setQty(1)
      const p = item.effectivePrice ?? 0
      setUnitPrice(p)
      setTotalPrice(p)
      setFees(0)
      setShipping(0)
      setTax(0)
      setNote('')
      setError(null)
    }
  }, [open, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (qty > item.quantity) { setError(`Max quantity is ${item.quantity}`); return }
    if (unitPrice <= 0) { setError('Sold price must be greater than 0'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: item.id,
          quantitySold: qty,
          soldUnitPrice: unitPrice,
          fees,
          shippingCost: shipping,
          tax,
          platform: platform || undefined,
          transactionDate: date,
          note: note || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed')
      onSuccess()
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Sell — ${item.cardName}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card info summary */}
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 flex items-center gap-3">
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.cardName} className="w-10 h-14 object-contain rounded" />
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-100">{item.cardName}</p>
            <p className="text-xs text-zinc-500">{[item.setName, item.cardNumber && `#${item.cardNumber}`].filter(Boolean).join(' · ')}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Owned: <span className="text-zinc-300 font-medium">{item.quantity}</span>
              {' · '}Avg cost: <span className="text-zinc-300 font-medium">{formatCurrency(item.weightedAvgCost)}</span>
            </p>
          </div>
        </div>

        {/* Quantity + Price */}
        <div className="grid grid-cols-[90px_1fr_1fr] gap-3">
          <Input
            label="Qty Sold"
            type="number"
            min={1}
            max={item.quantity}
            value={qty}
            onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
          />
          <Input
            label="Unit Price"
            type="number"
            min={0}
            step={0.01}
            prefix="$"
            value={unitPrice.toFixed(2)}
            onChange={(e) => handleUnitChange(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Total Amount"
            type="number"
            min={0}
            step={0.01}
            prefix="$"
            value={totalPrice.toFixed(2)}
            onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Fees */}
        <div className="grid grid-cols-3 gap-3">
          <Input label="Fees" type="number" min={0} step={0.01} prefix="$" value={fees} onChange={(e) => setFees(parseFloat(e.target.value) || 0)} hint="eBay ~11%" />
          <Input label="Shipping" type="number" min={0} step={0.01} prefix="$" value={shipping} onChange={(e) => setShipping(parseFloat(e.target.value) || 0)} />
          <Input label="Tax" type="number" min={0} step={0.01} prefix="$" value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} />
        </div>

        {/* Platform + Date */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Platform" options={PLATFORMS} value={platform} onChange={(e) => setPlatform(e.target.value)} />
          <Input label="Sale Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" />

        {/* P&L Preview */}
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-2 text-sm">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">P&L Preview</p>
          <Row label="Gross Sale" value={formatCurrency(grossSale)} />
          <Row label="Total Fees" value={`− ${formatCurrency(totalFees)}`} dim />
          <Row label="Net Proceeds" value={formatCurrency(netProceeds)} bold />
          <Row label={`Cost Basis (${qty} × ${formatCurrency(item.weightedAvgCost)})`} value={`− ${formatCurrency(costBasisSold)}`} dim />
          <div className="pt-2 border-t border-zinc-800">
            <Row
              label="Realized P&L"
              value={`${pnlSign(realizedPnL)}${formatCurrency(realizedPnL)}`}
              className={pnlColor(realizedPnL) + ' font-semibold text-base'}
            />
          </div>
          <p className="text-xs text-zinc-600 pt-1">Remaining after sale: {remaining} card{remaining !== 1 ? 's' : ''}</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={loading}>Confirm Sale</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  )
}

function Row({ label, value, dim, bold, className }: { label: string; value: string; dim?: boolean; bold?: boolean; className?: string }) {
  return (
    <div className={`flex items-center justify-between ${dim ? 'text-zinc-500' : 'text-zinc-300'}`}>
      <span>{label}</span>
      <span className={`font-mono ${bold ? 'font-semibold text-zinc-100' : ''} ${className ?? ''}`}>{value}</span>
    </div>
  )
}
