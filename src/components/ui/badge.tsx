import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-300',
  success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800',
  warning: 'bg-amber-900/50 text-amber-400 border border-amber-800',
  danger:  'bg-red-900/50 text-red-400 border border-red-800',
  info:    'bg-sky-900/50 text-sky-400 border border-sky-800',
  purple:  'bg-purple-900/50 text-purple-400 border border-purple-800',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
