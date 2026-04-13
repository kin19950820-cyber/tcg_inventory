import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { queryProducts, getRecentSyncLogs } from '@/services/releases/releaseSyncService'
import { getFollowedProducts } from '@/services/productFollowService'
import { ProductCard } from '@/components/products/ProductCard'
import { SyncPanel } from '@/components/products/SyncPanel'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ── Filter / sort definitions ─────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',          label: 'All' },
  { key: 'pokemon',      label: 'Pokémon' },
  { key: 'basketball',   label: 'Basketball' },
  { key: 'sports',       label: 'Sports' },
  { key: 'tcg',          label: 'TCG' },
  { key: 'preorder',     label: 'Preorder Open' },
  { key: 'coming-soon',  label: 'Coming Soon' },
  { key: 'this-month',   label: 'This Month' },
  { key: 'new',          label: 'New' },
] as const

const SORTS = [
  { key: 'release-date',  label: 'Release Date' },
  { key: 'preorder-date', label: 'Preorder Date' },
  { key: 'newest',        label: 'Newly Added' },
  { key: 'manufacturer',  label: 'Manufacturer' },
] as const

// ── Status grouping ───────────────────────────────────────────────────────────

const STATUS_GROUPS = [
  { statuses: ['PREORDER_OPEN', 'PREORDER'],        label: 'Available for Preorder' },
  { statuses: ['PREORDER_UPCOMING'],                label: 'Preorder Opening Soon' },
  { statuses: ['COMING_SOON', 'ANNOUNCED'],         label: 'Announced / Coming Soon' },
  { statuses: ['RELEASED'],                         label: 'Released' },
  { statuses: ['SOLD_OUT'],                         label: 'Sold Out' },
  { statuses: ['UNKNOWN'],                          label: 'TBD' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

interface SearchParams {
  filter?: string
  sort?: string
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { filter = 'all', sort = 'release-date' } = await searchParams

  const [products, userFollows, syncLogs] = await Promise.all([
    queryProducts({ filter, sort, limit: 300 }),
    getFollowedProducts(session.user.id),
    getRecentSyncLogs(1),
  ])

  const followedIds  = new Set(userFollows.map((f) => f.productReleaseId))
  const lastLog      = syncLogs[0] ?? null
  const lastSyncAt   = lastLog?.completedAt ?? null
  const lastSyncOk   = lastLog ? lastLog.success : null

  // Build URL helpers
  const filterUrl = (f: string) => {
    const p = new URLSearchParams({ filter: f, sort })
    return `/products?${p}`
  }
  const sortUrl = (s: string) => {
    const p = new URLSearchParams({ filter, sort: s })
    return `/products?${p}`
  }

  // Group products
  const grouped = STATUS_GROUPS.map((g) => ({
    ...g,
    items: products.filter((p) => g.statuses.includes(p.productStatus)),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Product Releases</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Upcoming and recent card product releases. Follow to get reminders.
          </p>
        </div>
        <SyncPanel lastSyncAt={lastSyncAt} lastSyncSuccess={lastSyncOk} />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap border-b border-zinc-800 pb-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={filterUrl(f.key)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-md font-medium transition-colors',
              filter === f.key
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800',
            )}
          >
            {f.label}
          </Link>
        ))}

        {/* Sort on the right */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-zinc-600 mr-1">Sort:</span>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={sortUrl(s.key)}
              className={cn(
                'text-xs px-2 py-1 rounded-md transition-colors',
                sort === s.key
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800',
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="rounded-xl border border-zinc-800 py-16 text-center text-sm text-zinc-600">
          No products found.{' '}
          {filter === 'all'
            ? 'Click Sync Now above to fetch the latest releases.'
            : 'Try a different filter, or sync to load more data.'}
        </div>
      )}

      {/* Grouped sections */}
      {grouped.map((group) => (
        <section key={group.label}>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            {group.label}
            <span className="ml-2 font-normal text-zinc-700">({group.items.length})</span>
          </h2>
          <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 overflow-hidden">
            {group.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFollowing={followedIds.has(product.id)}
              />
            ))}
          </div>
        </section>
      ))}

    </div>
  )
}
