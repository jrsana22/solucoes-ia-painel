import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch conversations with contact joined in a single query to avoid N+1 connection pressure
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*, contact:contacts(id, phone, name)')
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ conversations: [] })
  }

  // Fetch last message for each conversation in a single query
  // LIMIT to conversationIds.length * 10 rows to avoid fetching full history
  const conversationIds = conversations.map(c => c.id)
  const { data: allMessages } = await supabase
    .from('messages')
    .select('conversation_id, body, direction, sent_by, timestamp, status')
    .in('conversation_id', conversationIds)
    .order('timestamp', { ascending: false })
    .limit(conversationIds.length * 50)

  // Build a map of conversation_id -> last message
  const lastMessageMap: Record<string, typeof allMessages extends (infer T)[] | null ? T : never> = {}
  if (allMessages) {
    for (const msg of allMessages) {
      if (!lastMessageMap[msg.conversation_id]) {
        lastMessageMap[msg.conversation_id] = msg
      }
    }
  }

  const enriched = conversations.map(conv => ({
    ...conv,
    last_message: lastMessageMap[conv.id] ?? null,
  }))

  return NextResponse.json({ conversations: enriched })
}
