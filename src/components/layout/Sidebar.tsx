'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  TrendingUp,
  Plus,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/inventory',       label: 'Inventory',       icon: Package },
  { href: '/transactions',    label: 'Transactions',    icon: ArrowLeftRight },
  { href: '/pricing-review',  label: 'Price Review',    icon: TrendingUp },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col border-r border-zinc-800 bg-surface z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
          <span className="text-white text-xs font-black">TCG</span>
        </div>
        <span className="font-semibold text-zinc-100 text-sm">Vault</span>
      </div>

      {/* Quick add */}
      <div className="px-3 py-3 border-b border-zinc-800">
        <Link
          href="/inventory/new"
          className="flex items-center gap-2 w-full h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Add Card
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-brand-600/20 text-brand-400 font-medium'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">TCG Vault v0.1</p>
      </div>
    </aside>
  )
}
