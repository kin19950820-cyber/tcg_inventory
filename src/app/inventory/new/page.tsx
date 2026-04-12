import { AddInventoryForm } from '@/components/inventory/AddInventoryForm'
import { getCatalogStats } from '@/services/cardSearchService'

export default async function NewInventoryPage() {
  const stats = process.env.NODE_ENV === 'development' ? await getCatalogStats() : null

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Add Card</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Search to auto-fill, or enter details manually</p>
      </div>

      {/* Dev debug panel — visible only in development */}
      {stats && (
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-xs text-zinc-500 flex flex-wrap gap-x-5 gap-y-1">
          <span className="text-zinc-400 font-medium">Catalog debug</span>
          <span>Total: <span className={stats.total === 0 ? 'text-red-400 font-semibold' : 'text-zinc-300'}>{stats.total}</span></span>
          <span>Pokemon: <span className="text-zinc-300">{stats.pokemon}</span></span>
          <span>Sports: <span className="text-zinc-300">{stats.sports}</span></span>
          {stats.total === 0 && (
            <span className="text-red-400">&#9888; Catalog empty — run <code className="bg-zinc-800 px-1 rounded">npm run db:seed</code></span>
          )}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-surface-50 p-6">
        <AddInventoryForm />
      </div>
    </div>
  )
}
