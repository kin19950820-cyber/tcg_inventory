'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#818cf8', '#4f46e5', '#c4b5fd']

function PnLTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { month: string } }[] }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{payload[0].payload.month}</p>
      <p className={`font-mono font-bold ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {val >= 0 ? '+' : ''}{formatCurrency(val)}
      </p>
    </div>
  )
}

function AllocTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-200 font-medium">{payload[0].name}</p>
      <p className="font-mono text-zinc-400">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

interface Props {
  monthlyPnL: { month: string; realized: number }[]
  allocationByGame: { name: string; value: number; costBasis: number }[]
}

export default function PortfolioCharts({ monthlyPnL, allocationByGame }: Props) {
  const hasAnyPnL = monthlyPnL.some((m) => m.realized !== 0)
  const hasAllocation = allocationByGame.some((a) => a.costBasis > 0)

  if (!hasAnyPnL && !hasAllocation) return null

  return (
    <div className="grid grid-cols-2 gap-4">
      {hasAnyPnL && (
        <div className="rounded-xl border border-zinc-800 bg-surface-50 p-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Monthly Realized P&amp;L
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyPnL} barSize={14} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fill: '#52525b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(m: string) => m.slice(5)}
              />
              <YAxis hide />
              <Tooltip content={<PnLTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="realized" radius={[3, 3, 0, 0]}>
                {monthlyPnL.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.realized >= 0 ? '#34d399' : '#f87171'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasAllocation && (
        <div className="rounded-xl border border-zinc-800 bg-surface-50 p-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Portfolio Allocation
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={allocationByGame}
                dataKey="costBasis"
                nameKey="name"
                cx="38%"
                cy="50%"
                outerRadius={62}
                strokeWidth={0}
              >
                {allocationByGame.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<AllocTooltip />} />
              <Legend
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', color: '#71717a' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
