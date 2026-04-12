'use client'
import { useState } from 'react'
import { Bell, BellOff, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

type ProductRelease = {
  id: string
  name: string
  manufacturer: string | null
  brand: string | null
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
}

interface Props {
  product: ProductRelease
  isFollowing: boolean
}

const STATUS_BADGE: Record<string, string> = {
  PREORDER:  'bg-blue-500/10 text-blue-400 border-blue-500/30',
  ANNOUNCED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  RELEASED:  'bg-green-500/10 text-green-400 border-green-500/30',
  SOLD_OUT:  'bg-zinc-700/40 text-zinc-500 border-zinc-700',
  ARCHIVED:  'bg-zinc-700/40 text-zinc-500 border-zinc-700',
}

export function ProductReleaseRow({ product, isFollowing: initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  const toggleFollow = async () => {
    setLoading(true)
    const method = following ? 'DELETE' : 'POST'
    const res = await fetch(`/api/products/${product.id}/follow`, { method })
    if (res.ok) setFollowing(!following)
    setLoading(false)
  }

  const dateLabel = (() => {
    if (product.releaseDate) return `Releases ${formatDate(product.releaseDate)}`
    if (product.preorderDate) return `Preorder opens ${formatDate(product.preorderDate)}`
    if (product.announcementDate) return `Announced ${formatDate(product.announcementDate)}`
    return null
  })()

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Image */}
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-10 h-12 object-cover rounded flex-shrink-0 bg-zinc-800"
        />
      ) : (
        <div className="w-10 h-12 rounded bg-zinc-800 flex-shrink-0" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-zinc-100 truncate">{product.name}</p>
          <span
            className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${STATUS_BADGE[product.productStatus] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
          >
            {product.productStatus}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {dateLabel && <p className="text-xs text-zinc-500">{dateLabel}</p>}
          {product.season && (
            <p className="text-xs text-zinc-600">{product.season}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {product.externalUrl && (
          <a
            href={product.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <Button
          size="xs"
          variant={following ? 'secondary' : 'outline'}
          loading={loading}
          onClick={toggleFollow}
          className="gap-1"
        >
          {following ? <BellOff size={11} /> : <Bell size={11} />}
          {following ? 'Unfollow' : 'Follow'}
        </Button>
      </div>
    </div>
  )
}
