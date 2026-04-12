import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white text-xs font-black">TCG</span>
          </div>
          <span className="font-bold text-zinc-100 text-lg">Vault</span>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h1 className="text-xl font-bold text-zinc-100 mb-1">Sign in</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Welcome back to your portfolio.
          </p>
          <LoginForm />
        </div>
        <p className="text-center text-sm text-zinc-500 mt-4">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-brand-400 hover:text-brand-300">
            Register
          </a>
        </p>
      </div>
    </div>
  )
}
