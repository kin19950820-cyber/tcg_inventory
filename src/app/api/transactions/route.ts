import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executeSell } from '@/services/pnlService'
import { z } from 'zod'

const SellSchema = z.object({
  inventoryItemId: z.string(),
  quantitySold: z.number().int().min(1),
  soldUnitPrice: z.number().min(0),
  fees: z.number().min(0).default(0),
  shippingCost: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  platform: z.string().optional(),
  transactionDate: z.string(),
  note: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const itemId = searchParams.get('itemId')
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const where = {
    ...(itemId ? { inventoryItemId: itemId } : {}),
    ...(type ? { type } : {}),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { inventoryItem: { select: { cardName: true, setName: true, game: true } } },
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({ transactions, total, page, limit })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = SellSchema.parse(body)
    const transaction = await executeSell(input)
    return NextResponse.json({ ok: true, data: transaction }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 })
  }
}
