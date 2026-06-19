import {
  handleApiError,
  optionalNumber,
  optionalString,
  readJsonBody,
  requiredNumber,
  requiredString,
  requireAuth,
} from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { supabase, user } = await requireAuth()

    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('category', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ budgets })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth()
    const body = await readJsonBody(request)
    const category = requiredString(body, 'category')
    const limitAmount = requiredNumber(body, 'limit_amount', 'limitAmount')
    const currentSpent = optionalNumber(body, 'current_spent', 'currentSpent') ?? 0
    const period = optionalString(body, 'period') ?? 'monthly'

    const { data: budget, error } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        category,
        limit_amount: limitAmount,
        current_spent: currentSpent,
        period,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ budget }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
