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
    const updates: Record<string, string | number | null> = {}

    const name = optionalString(body, 'name')
    const targetAmount = optionalNumber(body, 'target_amount', 'targetAmount')
    const currentAmount = optionalNumber(body, 'current_amount', 'currentAmount')
    const targetDate = optionalString(body, 'target_date', 'targetDate')

    if (name !== undefined) updates.name = name
    if (targetAmount !== undefined) updates.target_amount = targetAmount
    if (currentAmount !== undefined) updates.current_amount = currentAmount
    if (targetDate !== undefined) updates.target_date = targetDate

    const { data: goal, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ goal })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { supabase, user } = await requireAuth()
    const { id } = await params

    const { error } = await supabase
      .from('goals')
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
