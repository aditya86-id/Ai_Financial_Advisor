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

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ profile })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, user } = await requireAuth()
    const body = await readJsonBody(request)
    const updates: Record<string, string> = {}

    const fullName = optionalString(body, 'full_name', 'fullName')
    const avatarUrl = optionalString(body, 'avatar_url', 'avatarUrl')

    if (fullName !== undefined) {
      updates.full_name = fullName
    }

    if (avatarUrl !== undefined) {
      updates.avatar_url = avatarUrl
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ profile })
  } catch (error) {
    return handleApiError(error)
  }
}
