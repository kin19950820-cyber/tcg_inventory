import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, ImageOff, RefreshCw, Star } from 'lucide-react'
import { MoverSection, MoverEmpty } from './MoverSection'
import type { NeedsAttentionItem } from '@/types'

const ISSUE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  'No price': { icon: AlertCircle, color: 'text-red-400' },
  'No image': { icon: ImageOff, color: 'text-zinc-500' },
  'Stale price': { icon: RefreshCw, color: 'text-amber-400' },
  'Manual price': { icon: Star, color: 'text-blue-400' },
}

export function NeedsAttentionSection({ items }: { items: NeedsAttentionItem[] }) {
  return (
    <MoverSection title="Needs Attention" viewAllHref="/pricing-review">
      {items.length === 0 ? (
        <MoverEmpty />
      ) : (
        items.slice(0, 8).map((item) => (
          <Link
            key={item.id}
            href={`/inventory/${item.id}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors group"
          >
            {item.imageUrl ? (
              <div className="relative w-7 h-10 flex-shrink-0">
                <Image
                  src={item.imageUrl}
                  alt={item.cardName}
                  fill
                  className="object-contain rounded"
                  sizes="28px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-7 h-10 rounded bg-zinc-800 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200 group-hover:text-brand-400 truncate">
                {item.cardName}
              </p>
              <p className="text-xs text-zinc-500 truncate">{item.setName}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              {item.issues.map((issue) => {
                const cfg = ISSUE_CONFIG[issue]
                if (!cfg) return null
                const Icon = cfg.icon
                return (
                  <span key={issue} className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                    <Icon size={10} />
                    {issue}
                  </span>
                )
              })}
            </div>
          </Link>
        ))
      )}
    </MoverSection>
  )
}
