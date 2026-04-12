import { NextRequest, NextResponse } from 'next/server'
import { registerUser, RegisterSchema } from '@/services/authService'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = RegisterSchema.parse(body)
    const user = await registerUser(input)
    return NextResponse.json({ ok: true, data: user }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: e.errors[0]?.message ?? 'Validation error' },
        { status: 400 },
      )
    }
    const message = e instanceof Error ? e.message : 'Registration failed'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
