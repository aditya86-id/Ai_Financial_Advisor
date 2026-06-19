import {
  handleApiError,
  optionalBoolean,
  optionalString,
  readJsonBody,
  requiredNumber,
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
    let accountId = optionalString(body, 'account_id', 'accountId')
    const date = optionalString(body, 'date') ?? new Date().toISOString().slice(0, 10)
    const description = optionalString(body, 'description') ?? 'Expense'
    const amount = requiredNumber(body, 'amount')
    const category = optionalString(body, 'category') ?? 'General'
    const isPending = optionalBoolean(body, 'is_pending', 'isPending') ?? false

    if (!accountId) {
      const { data: existingAccount, error: accountLookupError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Cash')
        .maybeSingle()

      if (accountLookupError) {
        throw accountLookupError
      }

      if (existingAccount) {
        accountId = existingAccount.id
      } else {
        const { data: createdAccount, error: accountCreateError } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            name: 'Cash',
            type: 'cash',
            balance: 0,
            currency: 'INR',
          })
          .select('id')
          .single()

        if (accountCreateError) {
          throw accountCreateError
        }

        accountId = createdAccount.id
      }
    }

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
