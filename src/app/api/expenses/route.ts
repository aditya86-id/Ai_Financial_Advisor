import {
  handleApiError,
  optionalBoolean,
  readJsonBody,
  requiredNumber,
  requiredString,
  requireAuth,
} from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireAuth()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)
    const offset = Number(searchParams.get('offset') ?? 0)

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: expenses, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ expenses })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth()
    const body = await readJsonBody(request)
    const accountId = requiredString(body, 'account_id', 'accountId')
    const date = requiredString(body, 'date')
    const description = requiredString(body, 'description')
    const amount = requiredNumber(body, 'amount')
    const category = requiredString(body, 'category')
    const isPending = optionalBoolean(body, 'is_pending', 'isPending') ?? false

    const { data: expense, error } = await supabase
      .from('transactions')
      .insert({
        account_id: accountId,
        user_id: user.id,
        date,
        description,
        amount,
        category,
        type: 'expense',
        is_pending: isPending,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
