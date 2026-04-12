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
  MessageSquare,
  Bell,
  ShoppingBag,
  LogOut,
  User,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/inventory',       label: 'Inventory',       icon: Package },
  { href: '/transactions',    label: 'Transactions',    icon: ArrowLeftRight },
  { href: '/pricing-review',  label: 'Price Review',    icon: TrendingUp },
  { href: '/products',        label: 'Products',        icon: ShoppingBag },
  { href: '/messages',        label: 'Messages',        icon: MessageSquare },
  { href: '/notifications',   label: 'Notifications',   icon: Bell, badge: true },
]

interface SidebarUser {
  displayName: string | null
  username: string
}

interface Props {
  user?: SidebarUser | null
  unreadCount?: number
  signOutAction: () => Promise<void>
}

export function Sidebar({ user, unreadCount = 0, signOutAction }: Props) {
  const pathname = usePathname()
  const initial = (user?.displayName ?? user?.username ?? '?')[0]?.toUpperCase()
  const displayName = user?.displayName ?? user?.username

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
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const showBadge = badge && unreadCount > 0
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
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-zinc-800 space-y-1">
        {user ? (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-600/50 flex items-center justify-center text-brand-400 font-bold text-xs flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{displayName}</p>
                {user.username && (
                  <p className="text-xs text-zinc-600 truncate">@{user.username}</p>
                )}
              </div>
              <User size={13} className="text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-2.5 px-2 py-1.5 w-full rounded-md text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 block">
            Sign in
          </Link>
        )}
      </div>
    </aside>
  )
}
