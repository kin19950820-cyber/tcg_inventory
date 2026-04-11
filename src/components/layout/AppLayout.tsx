import { Sidebar } from './Sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-zinc-100">
      <Sidebar />
      <main className="ml-56 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
