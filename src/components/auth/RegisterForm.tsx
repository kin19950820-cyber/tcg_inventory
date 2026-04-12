'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { credentialsSignIn } from '@/app/login/actions'

export function RegisterForm() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', displayName: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Registration failed')
        setLoading(false)
        return
      }

      // Auto sign-in after registration — success throws a redirect
      await credentialsSignIn(form.email, form.password, '/dashboard')
    } catch (err) {
      // Re-throw Next.js redirects so the router follows them
      if ((err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw err
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Username *"
          value={form.username}
          onChange={(e) => set('username', e.target.value)}
          placeholder="cardtrader99"
          autoFocus
          required
        />
        <Input
          label="Display Name"
          value={form.displayName}
          onChange={(e) => set('displayName', e.target.value)}
          placeholder="Card Trader"
        />
      </div>
      <Input
        label="Email *"
        type="email"
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        label="Password *"
        type="password"
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        placeholder="At least 8 characters"
        required
      />

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Create account
      </Button>
    </form>
  )
}
