'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

interface UserData {
  id: string; username: string; email: string; displayName: string | null
  avatarUrl: string | null; bio: string | null; locationCountry: string | null
  profileVisibility: string; inventoryVisibility: string; allowTradeMessages: boolean
}

export function ProfileForm({ user }: { user: UserData }) {
  const router = useRouter()
  const [form, setForm] = useState({
    displayName: user.displayName ?? '',
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? '',
    locationCountry: user.locationCountry ?? '',
    profileVisibility: user.profileVisibility,
    inventoryVisibility: user.inventoryVisibility,
    allowTradeMessages: user.allowTradeMessages,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch(`/api/users/${user.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Save failed')
      setSuccess(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Identity */}
      <div className="rounded-xl border border-zinc-800 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Identity</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Username</p>
            <p className="text-sm text-zinc-400 font-mono bg-zinc-900 rounded-md px-3 py-2 border border-zinc-800">
              @{user.username}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Email</p>
            <p className="text-sm text-zinc-400 bg-zinc-900 rounded-md px-3 py-2 border border-zinc-800 truncate">
              {user.email}
            </p>
          </div>
        </div>
        <Input
          label="Display Name"
          value={form.displayName}
          onChange={(e) => set('displayName', e.target.value)}
          placeholder="Card Trader"
        />
        <div>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide block mb-1.5">
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="A few words about your collection..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Avatar URL"
            value={form.avatarUrl}
            onChange={(e) => set('avatarUrl', e.target.value)}
            placeholder="https://..."
          />
          <Input
            label="Country"
            value={form.locationCountry}
            onChange={(e) => set('locationCountry', e.target.value)}
            placeholder="US, JP, UK..."
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-xl border border-zinc-800 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Privacy</h2>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Profile Visibility"
            value={form.profileVisibility}
            onChange={(e) => set('profileVisibility', e.target.value)}
            options={[
              { value: 'PUBLIC', label: 'Public' },
              { value: 'PRIVATE', label: 'Private' },
            ]}
          />
          <Select
            label="Inventory Visibility"
            value={form.inventoryVisibility}
            onChange={(e) => set('inventoryVisibility', e.target.value)}
            options={[
              { value: 'PRIVATE', label: 'Private (only me)' },
              { value: 'PUBLIC', label: 'Public' },
              { value: 'TRADEABLE_ONLY', label: 'Tradeable items only' },
            ]}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allowDMs"
            checked={form.allowTradeMessages}
            onChange={(e) => set('allowTradeMessages', e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="allowDMs" className="text-sm text-zinc-300">
            Allow trade messages from other users
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800/50 rounded-md px-3 py-2">
          Profile saved.
        </p>
      )}

      <Button type="submit" loading={saving}>Save changes</Button>
    </form>
  )
}
