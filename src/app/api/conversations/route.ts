import {
  handleApiError,
  optionalString,
  readJsonBody,
  requireAuth,
} from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { supabase, user } = await requireAuth()

    const { data: conversations, error } = await supabase
      .from('ai_coach_conversations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ conversations })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth()
    const body = await readJsonBody(request)
    const title = optionalString(body, 'title') ?? 'New conversation'

    const { data: conversation, error } = await supabase
      .from('ai_coach_conversations')
      .insert({
        user_id: user.id,
        title,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
