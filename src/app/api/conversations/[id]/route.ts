import { handleApiError, requireAuth } from '@/lib/api'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { supabase, user } = await requireAuth()
    const { id } = await params

    const { data: conversation, error: conversationError } = await supabase
      .from('ai_coach_conversations')
      .select('id, title, created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (conversationError) {
      throw conversationError
    }

    const { data: messages, error: messagesError } = await supabase
      .from('ai_coach_messages')
      .select('id, sender, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      throw messagesError
    }

    return NextResponse.json({ conversation, messages })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { supabase, user } = await requireAuth()
    const { id } = await params

    const { error } = await supabase
      .from('ai_coach_conversations')
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
