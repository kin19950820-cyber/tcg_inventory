import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
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
          <h1 className="text-xl font-bold text-zinc-100 mb-1">Create account</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Start tracking your card portfolio.
          </p>
          <RegisterForm />
        </div>
        <p className="text-center text-sm text-zinc-500 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-brand-400 hover:text-brand-300">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
