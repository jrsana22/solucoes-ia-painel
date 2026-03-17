import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Busca contatos e última mensagem para cada conversa
  const enriched = await Promise.all((conversations ?? []).map(async (conv) => {
    const [{ data: contact }, { data: msgs }] = await Promise.all([
      supabase.from('contacts').select('id, phone, name').eq('id', conv.contact_id).single(),
      supabase.from('messages').select('body, direction, sent_by, timestamp, status').eq('conversation_id', conv.id).order('timestamp', { ascending: false }).limit(1),
    ])
    return { ...conv, contact: contact ?? null, last_message: msgs?.[0] ?? null }
  }))

  return NextResponse.json({ conversations: enriched })
}
