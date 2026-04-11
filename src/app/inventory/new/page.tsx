import { AddInventoryForm } from '@/components/inventory/AddInventoryForm'

export default function NewInventoryPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Add Card</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Search to auto-fill, or enter details manually</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-surface-50 p-6">
        <AddInventoryForm />
      </div>
    </div>
  )
}
