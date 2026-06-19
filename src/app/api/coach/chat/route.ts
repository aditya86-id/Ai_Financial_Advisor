import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type GroqMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type GroqStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

async function createGroqStream(messages: GroqMessage[]) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
      messages,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    const details = await response.text()
    throw new Error(`Groq request failed: ${details || response.statusText}`)
  }

  return response.body
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId, message } = await request.json()
    if (!conversationId || !message) {
      return NextResponse.json({ error: 'Missing conversationId or message' }, { status: 400 })
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('ai_coach_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 2. Save user message to database
    await supabase.from('ai_coach_messages').insert({
      conversation_id: conversationId,
      sender: 'user',
      content: message,
    })

    // 3. Fetch past messages for context (limit to last 20 messages)
    const { data: pastMessages } = await supabase
      .from('ai_coach_messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    const formattedMessages = (pastMessages || []).map((msg) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }))

    const groqStream = await createGroqStream([
        {
          role: 'system',
          content: 'You are FinCoach AI, a professional and friendly AI personal finance coach. Provide actionable, concise, and structured advice regarding savings, budgeting, investments, and debt management.'
        },
        ...formattedMessages,
    ])

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const customStream = new ReadableStream({
      async start(controller) {
        let assistantContent = ''
        let buffer = ''
        const reader = groqStream.getReader()
        
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()

              if (!trimmed.startsWith('data:')) {
                continue
              }

              const payload = trimmed.slice(5).trim()

              if (payload === '[DONE]') {
                continue
              }

              const chunk = JSON.parse(payload) as GroqStreamChunk
              const text = chunk.choices?.[0]?.delta?.content ?? ''

              if (text) {
                assistantContent += text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
              }
            }
          }
          
          // Save assistant message to database on stream completion
          await supabase.from('ai_coach_messages').insert({
            conversation_id: conversationId,
            sender: 'assistant',
            content: assistantContent,
          })
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 })
  }
}
