import {
  handleApiError,
  optionalNumber,
  optionalString,
  readJsonBody,
  requireAuth,
} from '@/lib/api'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { supabase, user } = await requireAuth()
    const { id } = await params
    const body = await readJsonBody(request)
    const updates: Record<string, string | number> = {}

    const category = optionalString(body, 'category')
    const limitAmount = optionalNumber(body, 'limit_amount', 'limitAmount')
    const currentSpent = optionalNumber(body, 'current_spent', 'currentSpent')
    const period = optionalString(body, 'period')

    if (category !== undefined) updates.category = category
    if (limitAmount !== undefined) updates.limit_amount = limitAmount
    if (currentSpent !== undefined) updates.current_spent = currentSpent
    if (period !== undefined) updates.period = period

    const { data: budget, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ budget })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { supabase, user } = await requireAuth()
    const { id } = await params

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
