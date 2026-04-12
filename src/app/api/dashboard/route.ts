import { NextResponse } from 'next/server'
import { getDashboardData } from '@/services/dashboardService'

export async function GET() {
  const data = await getDashboardData()
  return NextResponse.json(data)
}
