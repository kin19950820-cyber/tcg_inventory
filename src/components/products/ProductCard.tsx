'use client'
import { useState } from 'react'
import { Bell, BellOff, ExternalLink, CalendarDays, ShoppingCart, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type ProductRelease = {
  id: string
  name: string
  manufacturer: string | null
  brand: string | null
  productLine: string | null
  category: string
  sport: string | null
  game: string | null
  season: string | null
  year: number | null
  imageUrl: string | null
  description: string | null
  announcementDate: Date | null
  preorderDate: Date | null
  releaseDate: Date | null
  productStatus: string
  externalUrl: string | null
  sourceName: string | null
  sourceUrl: string | null
  isNew: boolean
  firstSeenAt: Date | string
  lastCheckedAt: Date | null
}

interface Props {
  product: ProductRelease
  isFollowing: boolean
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ANNOUNCED:         { label: 'Announced',      dot: 'bg-yellow-400',  badge: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' },
  COMING_SOON:       { label: 'Coming Soon',    dot: 'bg-orange-400',  badge: 'border-orange-500/40 bg-orange-500/10 text-orange-300' },
  PREORDER_UPCOMING: { label: 'Preorder Soon',  dot: 'bg-sky-400',     badge: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  PREORDER_OPEN:     { label: 'Preorder Open',  dot: 'bg-blue-400 animate-pulse', badge: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
  PREORDER:          { label: 'Preorder Open',  dot: 'bg-blue-400 animate-pulse', badge: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
  RELEASED:          { label: 'Released',       dot: 'bg-emerald-400', badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  SOLD_OUT:          { label: 'Sold Out',       dot: 'bg-zinc-500',    badge: 'border-zinc-600 bg-zinc-700/30 text-zinc-500' },
  UNKNOWN:           { label: 'TBD',            dot: 'bg-zinc-600',    badge: 'border-zinc-700 bg-zinc-800 text-zinc-500' },
}

const SOURCE_BADGE: Record<string, string> = {
  'pokemon-tcg-api': 'Pokémon TCG API',
  'manual':          'Curated',
  'beckett':         'Beckett',
  'topps':           'Topps',
  'panini':          'Panini',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: Date | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function countdown(date: Date | null): string | null {
  if (!date) return null
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0)  return null
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 7)  return `${days}d`
  if (days <= 30) return `${Math.ceil(days / 7)}w`
  return `${Math.ceil(days / 30)}mo`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductCard({ product, isFollowing: init }: Props) {
  const [following, setFollowing] = useState(init)
  const [loading, setLoading]     = useState(false)

  const toggle = async () => {
    setLoading(true)
    const res = await fetch(`/api/products/${product.id}/follow`, {
      method: following ? 'DELETE' : 'POST',
    })
    if (res.ok) setFollowing(!following)
    setLoading(false)
  }

  const status  = STATUS_CONFIG[product.productStatus] ?? STATUS_CONFIG['UNKNOWN']
  const srcName = SOURCE_BADGE[product.sourceName ?? ''] ?? product.sourceName ?? null

  const releaseCD  = countdown(product.releaseDate)
  const preorderCD = countdown(product.preorderDate)

  const subline = [
    product.manufacturer,
    product.brand !== product.manufacturer ? product.brand : null,
    product.season ?? (product.year ? String(product.year) : null),
  ].filter(Boolean).join(' · ')

  const categoryTag = product.category === 'SPORTS'
    ? (product.sport ?? 'Sports')
    : (product.game ? product.game.charAt(0).toUpperCase() + product.game.slice(1) : 'TCG')

  return (
    <div className="group relative flex gap-3 px-4 py-3.5 hover:bg-zinc-800/40 transition-colors">
      {/* Image */}
      <div className="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-zinc-800">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold">
            {product.manufacturer?.slice(0, 1) ?? '?'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">

        {/* Title row */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-semibold text-zinc-100 leading-tight">{product.name}</span>

          {/* Status badge */}
          <span className={cn('inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0', status.badge)}>
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status.dot)} />
            {status.label}
          </span>

          {/* NEW badge */}
          {product.isNew && (
            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border border-brand-500/40 bg-brand-600/10 text-brand-300 font-semibold flex-shrink-0">
              <Sparkles size={9} />
              NEW
            </span>
          )}
        </div>

        {/* Sub-line: manufacturer · brand · season */}
        <div className="flex items-center gap-2 flex-wrap">
          {subline && <p className="text-xs text-zinc-500">{subline}</p>}
          <span className="text-xs text-zinc-700 border border-zinc-800 rounded px-1">{categoryTag}</span>
          {srcName && <span className="text-xs text-zinc-700">{srcName}</span>}
        </div>

        {/* Date chips */}
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {product.preorderDate && (
            <span className="inline-flex items-center gap-1 text-xs text-sky-400/80">
              <ShoppingCart size={10} />
              Preorder {fmt(product.preorderDate)}
              {preorderCD && <span className="text-sky-300 font-semibold ml-0.5">({preorderCD})</span>}
            </span>
          )}
          {product.releaseDate && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <CalendarDays size={10} />
              {product.productStatus === 'RELEASED' ? 'Released' : 'Releases'} {fmt(product.releaseDate)}
              {releaseCD && <span className="text-emerald-400 font-semibold ml-0.5">({releaseCD})</span>}
            </span>
          )}
          {!product.preorderDate && !product.releaseDate && product.announcementDate && (
            <span className="text-xs text-zinc-600">Announced {fmt(product.announcementDate)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {product.externalUrl && (
          <a
            href={product.externalUrl}
            target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
            title="Open product page"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <button
          onClick={toggle}
          disabled={loading}
          title={following ? 'Unfollow' : 'Follow for reminders'}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            following
              ? 'text-brand-400 hover:text-zinc-400 hover:bg-zinc-700'
              : 'text-zinc-600 hover:text-brand-400 hover:bg-zinc-700',
          )}
        >
          {following ? <BellOff size={13} /> : <Bell size={13} />}
        </button>
      </div>
    </div>
  )
}
