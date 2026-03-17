import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------
// POST /api/register-outbound
// Chamado pelo n8n após enviar uma mensagem pela Meta API.
// Registra a mensagem no banco para aparecer no painel.
//
// Body:
// {
//   phone_number_id: string   — ID do número Meta (identifica o tenant)
//   to: string                — número do destinatário (ex: 553186058233)
//   body: string              — texto da mensagem enviada
//   meta_message_id?: string  — ID retornado pela Meta API (opcional)
//   sent_by?: 'agent' | 'system'  — padrão: 'agent'
// }
// ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: {
    phone_number_id: string
    to: string
    body: string
    meta_message_id?: string
    sent_by?: 'agent' | 'system'
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { phone_number_id, to, body: messageBody, meta_message_id, sent_by = 'agent' } = body

  if (!phone_number_id || !to || !messageBody?.trim()) {
    return NextResponse.json(
      { error: 'phone_number_id, to e body são obrigatórios' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Busca o tenant pelo phone_number_id
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('meta_phone_number_id', phone_number_id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado para este phone_number_id' }, { status: 404 })
  }

  // Upsert do contato
  const { data: contact } = await supabase
    .from('contacts')
    .upsert(
      { tenant_id: tenant.id, phone: to },
      { onConflict: 'tenant_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (!contact) {
    return NextResponse.json({ error: 'Erro ao criar contato' }, { status: 500 })
  }

  // Upsert da conversa
  const { data: conversation } = await supabase
    .from('conversations')
    .upsert(
      {
        tenant_id: tenant.id,
        contact_id: contact.id,
        status: 'open',
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,contact_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Erro ao criar conversa' }, { status: 500 })
  }

  // Insere a mensagem
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      tenant_id: tenant.id,
      direction: 'outbound',
      body: messageBody.trim(),
      status: 'sent',
      sent_by,
      meta_message_id: meta_message_id ?? null,
    })
    .select()
    .single()

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // Atualiza last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation.id)

  return NextResponse.json({ message }, { status: 201 })
}
