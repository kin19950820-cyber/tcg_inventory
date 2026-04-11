import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSchema = z.object({
  game: z.string().default('pokemon'),
  cardName: z.string().min(1),
  setName: z.string().optional(),
  cardNumber: z.string().optional(),
  language: z.string().default('EN'),
  rarity: z.string().optional(),
  variant: z.string().optional(),
  conditionRaw: z.string().optional(),
  gradingCompany: z.string().optional(),
  grade: z.string().optional(),
  certNumber: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  purchasePrice: z.number().min(0),
  purchaseDate: z.string(),
  fees: z.number().min(0).default(0),
  shippingCost: z.number().min(0).default(0),
  source: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  manualImageUrl: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const game = searchParams.get('game')
  const search = searchParams.get('q')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const skip = (page - 1) * limit

  const where = {
    ...(game ? { game } : {}),
    ...(search
      ? {
          OR: [
            { cardName: { contains: search } },
            { setName: { contains: search } },
            { certNumber: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: { priceComps: { take: 1, orderBy: { fetchedAt: 'desc' } } },
    }),
    prisma.inventoryItem.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateSchema.parse(body)

    const item = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventoryItem.create({
        data: {
          ...data,
          purchaseDate: new Date(data.purchaseDate),
        },
      })

      // Create corresponding BUY transaction
      const totalCost = data.purchasePrice * data.quantity + data.fees + data.shippingCost
      await tx.transaction.create({
        data: {
          inventoryItemId: inv.id,
          type: 'BUY',
          quantity: data.quantity,
          unitPrice: data.purchasePrice,
          fees: data.fees,
          shippingCost: data.shippingCost,
          tax: 0,
          netAmount: -totalCost,
          transactionDate: new Date(data.purchaseDate),
          platform: data.source,
        },
      })

      return inv
    })

    return NextResponse.json({ ok: true, data: item }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
