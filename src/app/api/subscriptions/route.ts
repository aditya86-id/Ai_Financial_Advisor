import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    subscription: {
      status: 'active',
      plan: 'free',
      provider: null,
      current_period_end: null,
    },
  })
}
