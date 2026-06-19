import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new ApiError(401, 'Unauthorized')
  }

  return { supabase, user }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error'
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    throw new ApiError(400, 'Invalid JSON body')
  }
}

export function requiredString(
  body: Record<string, unknown>,
  field: string,
  fallbackField?: string
) {
  const value = body[field] ?? (fallbackField ? body[fallbackField] : undefined)

  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, `Missing required field: ${fallbackField ?? field}`)
  }

  return value
}

export function requiredNumber(
  body: Record<string, unknown>,
  field: string,
  fallbackField?: string
) {
  const value = body[field] ?? (fallbackField ? body[fallbackField] : undefined)
  const numberValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numberValue)) {
    throw new ApiError(400, `Missing required field: ${fallbackField ?? field}`)
  }

  return numberValue
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
  fallbackField?: string
) {
  const value = body[field] ?? (fallbackField ? body[fallbackField] : undefined)

  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, `Invalid field: ${fallbackField ?? field}`)
  }

  return value
}

export function optionalNumber(
  body: Record<string, unknown>,
  field: string,
  fallbackField?: string
) {
  const value = body[field] ?? (fallbackField ? body[fallbackField] : undefined)

  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const numberValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numberValue)) {
    throw new ApiError(400, `Invalid field: ${fallbackField ?? field}`)
  }

  return numberValue
}

export function optionalBoolean(
  body: Record<string, unknown>,
  field: string,
  fallbackField?: string
) {
  const value = body[field] ?? (fallbackField ? body[fallbackField] : undefined)

  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw new ApiError(400, `Invalid field: ${fallbackField ?? field}`)
  }

  return value
}
