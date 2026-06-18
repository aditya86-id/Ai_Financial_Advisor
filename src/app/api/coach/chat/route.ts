import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

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

    // 4. Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // 5. Query OpenAI chat API with streaming
    const responseStream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are FinCoach AI, a professional and friendly AI personal finance coach. Provide actionable, concise, and structured advice regarding savings, budgeting, investments, and debt management.'
        },
        ...formattedMessages,
      ],
      stream: true,
    })

    // 6. Return standard SSE Stream
    const encoder = new TextEncoder()
    const customStream = new ReadableStream({
      async start(controller) {
        let assistantContent = ''
        
        try {
          for await (const chunk of responseStream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              assistantContent += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
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
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
