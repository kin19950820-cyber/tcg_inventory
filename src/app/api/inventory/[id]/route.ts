import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getInventoryItemWithStats } from '@/services/pnlService'
import { z } from 'zod'

const UpdateSchema = z.object({
  cardName: z.string().min(1).optional(),
  setName: z.string().optional(),
  cardNumber: z.string().optional(),
  language: z.string().optional(),
  rarity: z.string().optional(),
  variant: z.string().optional(),
  conditionRaw: z.string().optional(),
  gradingCompany: z.string().optional(),
  grade: z.string().optional(),
  certNumber: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  purchasePrice: z.number().min(0).optional(),
  fees: z.number().min(0).optional(),
  shippingCost: z.number().min(0).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  manualImageUrl: z.string().nullable().optional(),
  priceOverride: z.number().nullable().optional(),
  priceOverrideNote: z.string().nullable().optional(),
}).partial()

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const item = await getInventoryItemWithStats(id)
    return NextResponse.json({ ok: true, data: item })
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await req.json()
    const data = UpdateSchema.parse(body)
    const item = await prisma.inventoryItem.update({ where: { id }, data })
    return NextResponse.json({ ok: true, data: item })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    await prisma.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ ok: true, data: null })
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }
}
