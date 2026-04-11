import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, pnlColor, pnlSign } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { transactionDate: 'desc' },
    take: 200,
    include: {
      inventoryItem: { select: { cardName: true, setName: true, game: true, imageUrl: true } },
    },
  })

  const totalRealized = transactions
    .filter((t) => t.type === 'SELL')
    .reduce((s, t) => s + (t.realizedPnL ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Transactions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{transactions.length} records</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Total Realized P&L</p>
          <p className={`text-lg font-mono font-bold ${pnlColor(totalRealized)}`}>
            {pnlSign(totalRealized)}{formatCurrency(totalRealized)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/50 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Card</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Type</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Qty</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Unit</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Fees</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Net</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">P&L</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Platform</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-200 truncate max-w-[200px]">{t.inventoryItem.cardName}</p>
                  <p className="text-xs text-zinc-500 truncate">{t.inventoryItem.setName}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={t.type === 'BUY' ? 'info' : t.type === 'SELL' ? 'success' : 'default'}>
                    {t.type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">{t.quantity}</td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">{formatCurrency(t.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-mono text-zinc-500 text-xs">
                  {t.fees + t.shippingCost > 0 ? formatCurrency(t.fees + t.shippingCost) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-200">{formatCurrency(Math.abs(t.netAmount))}</td>
                <td className={`px-4 py-3 text-right font-mono ${pnlColor(t.realizedPnL)}`}>
                  {t.realizedPnL != null ? `${pnlSign(t.realizedPnL)}${formatCurrency(t.realizedPnL)}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{t.platform ?? '—'}</td>
                <td className="px-4 py-3 text-right text-xs text-zinc-500">{formatDate(t.transactionDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
