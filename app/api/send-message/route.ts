import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/meta'

// ---------------------------------------------------------------
// POST /api/send-message
// Envia uma mensagem manual do painel via Meta API oficial.
// Body: { conversation_id: string, tenant_id: string, message: string }
// ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: { conversation_id: string; tenant_id: string; message: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversation_id, tenant_id, message } = body

  if (!conversation_id || !tenant_id || !message?.trim()) {
    return NextResponse.json(
      { error: 'conversation_id, tenant_id e message são obrigatórios' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Busca tenant e conversa (valida isolamento multi-tenant)
  const [{ data: tenant }, { data: conversation }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, meta_phone_number_id, meta_access_token')
      .eq('id', tenant_id)
      .single(),
    supabase
      .from('conversations')
      .select('id, tenant_id, contact_id, contacts(phone)')
      .eq('id', conversation_id)
      .eq('tenant_id', tenant_id)   // garante isolamento
      .single(),
  ])

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  if (!conversation) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  const contact = conversation.contacts as unknown as { phone: string }
  if (!contact?.phone) {
    return NextResponse.json({ error: 'Contato sem número de telefone' }, { status: 422 })
  }

  // Envia pela Meta API oficial
  let metaMessageId: string | null = null
  try {
    const metaRes = await sendTextMessage({
      phoneNumberId: tenant.meta_phone_number_id,
      accessToken: tenant.meta_access_token,
      to: contact.phone,
      body: message.trim(),
    })
    metaMessageId = metaRes.messages?.[0]?.id ?? null
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: `Falha ao enviar pela Meta API: ${errorMessage}` },
      { status: 502 }
    )
  }

  // Persiste no banco
  const { data: savedMessage, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      tenant_id,
      direction: 'outbound',
      body: message.trim(),
      status: 'sent',
      sent_by: 'human',
      meta_message_id: metaMessageId,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: `Mensagem enviada mas não salva: ${insertError.message}` },
      { status: 500 }
    )
  }

  // Atualiza last_message_at da conversa
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation_id)

  return NextResponse.json({ message: savedMessage })
}
