import { cn, pnlColor, pnlSign, formatCurrency } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  variant?: 'default' | 'pnl'
  pnlValue?: number
  currency?: boolean
}

export function StatCard({ title, value, sub, icon: Icon, variant = 'default', pnlValue, currency }: StatCardProps) {
  const displayValue = currency && typeof value === 'number' ? formatCurrency(value) : value
  const colorClass = variant === 'pnl' && pnlValue != null ? pnlColor(pnlValue) : 'text-zinc-100'

  return (
    <div className="rounded-xl border border-zinc-800 bg-surface-50 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
        {Icon && <Icon size={16} className="text-zinc-600" />}
      </div>
      <div>
        <p className={cn('text-2xl font-bold font-mono', colorClass)}>
          {variant === 'pnl' && pnlValue != null ? `${pnlSign(pnlValue)}${displayValue}` : displayValue}
        </p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
