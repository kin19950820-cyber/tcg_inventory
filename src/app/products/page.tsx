import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getAllProducts } from '@/services/productFollowService'
import { getFollowedProducts } from '@/services/productFollowService'
import { ProductReleaseRow } from '@/components/products/ProductReleaseRow'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [allProducts, userFollows] = await Promise.all([
    getAllProducts(),
    getFollowedProducts(session.user.id),
  ])

  const followedIds = new Set(userFollows.map((f) => f.productReleaseId))

  const groups = {
    PREORDER: allProducts.filter((p) => p.productStatus === 'PREORDER'),
    ANNOUNCED: allProducts.filter((p) => p.productStatus === 'ANNOUNCED'),
    RELEASED: allProducts.filter((p) => p.productStatus === 'RELEASED'),
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Product Releases</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Upcoming and recent card product releases. Follow to get reminders.
        </p>
      </div>

      {(['PREORDER', 'ANNOUNCED', 'RELEASED'] as const).map((status) => {
        const items = groups[status]
        if (items.length === 0) return null
        const labels: Record<string, string> = {
          PREORDER: 'Available for Preorder',
          ANNOUNCED: 'Announced',
          RELEASED: 'Recently Released',
        }
        return (
          <section key={status}>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {labels[status]}
              <span className="ml-2 font-normal text-zinc-600">({items.length})</span>
            </h2>
            <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800">
              {items.map((product) => (
                <ProductReleaseRow
                  key={product.id}
                  product={product}
                  isFollowing={followedIds.has(product.id)}
                />
              ))}
            </div>
          </section>
        )
      })}

      {allProducts.length === 0 && (
        <div className="text-center py-16 text-zinc-600 text-sm rounded-xl border border-zinc-800">
          No products yet. Products will appear here as they are announced.
        </div>
      )}
    </div>
  )
}
