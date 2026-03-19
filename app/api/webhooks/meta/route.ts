import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { MetaWebhookPayload } from '@/lib/meta'

// ---------------------------------------------------------------
// GET — Verificação do webhook pela Meta
// A Meta faz uma requisição GET para confirmar o endpoint antes
// de começar a enviar eventos. Registre este endpoint no:
// Meta Developer Console > WhatsApp > Configuration > Webhook
// URL: https://seu-dominio.com/api/webhooks/meta
// ---------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// ---------------------------------------------------------------
// POST — Recebimento de eventos da Meta (mensagens + status updates)
// Este webhook é chamado DIRETAMENTE pela Meta.
// O n8n tem seu próprio webhook para processamento de IA — este
// endpoint apenas persiste os dados no Supabase.
// ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  let payload: MetaWebhookPayload

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' })
  }

  const supabase = createServiceClient()

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      const phoneNumberId = value.metadata?.phone_number_id

      if (!phoneNumberId) continue

      // Busca o tenant pelo phone_number_id
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, n8n_webhook_url')
        .eq('meta_phone_number_id', phoneNumberId)
        .single()

      console.log('[webhook] phoneNumberId received:', JSON.stringify(phoneNumberId))
      if (tenantError) console.error('[webhook] tenant error:', tenantError)
      if (!tenant) { console.error('[webhook] tenant not found for phoneNumberId:', phoneNumberId); continue }

      // -------------------------------------------------------
      // Mensagens recebidas
      // -------------------------------------------------------
      for (const msg of value.messages ?? []) {
        // Suporta: text, audio, ptt (voice note), image, document
        const supportedTypes = ['text', 'audio', 'ptt', 'image', 'document']
        if (!supportedTypes.includes(msg.type)) continue

        // Extrai body e mídia dependendo do tipo
        let body = ''
        let mediaType: string | null = null
        let mediaId: string | null = null

        if (msg.type === 'text') {
          if (!msg.text?.body) continue
          body = msg.text.body
        } else if (msg.type === 'audio' || msg.type === 'ptt') {
          body = '[Áudio]'
          mediaType = 'audio'
          mediaId = msg.audio?.id ?? msg.ptt?.id ?? null
        } else if (msg.type === 'image') {
          body = msg.image?.caption ?? '[Imagem]'
          mediaType = 'image'
          mediaId = msg.image?.id ?? null
        } else if (msg.type === 'document') {
          body = msg.document?.filename ?? '[Documento]'
          mediaType = 'document'
          mediaId = msg.document?.id ?? null
        }

        const senderPhone = msg.from
        const senderName = value.contacts?.find((c: { wa_id: string }) => c.wa_id === senderPhone)?.profile?.name ?? null

        // Upsert do contato (salva nome se disponível)
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .upsert(
            { tenant_id: tenant.id, phone: senderPhone, name: senderName },
            { onConflict: 'tenant_id,phone', ignoreDuplicates: false }
          )
          .select('id')
          .single()

        if (contactError) console.error('[webhook] contact error:', contactError)
        if (!contact) continue

        // Upsert da conversa (abre se não existe)
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .upsert(
            {
              tenant_id: tenant.id,
              contact_id: contact.id,
              status: 'open',
              last_message_at: new Date(Number(msg.timestamp) * 1000).toISOString(),
            },
            { onConflict: 'tenant_id,contact_id', ignoreDuplicates: false }
          )
          .select('id')
          .single()

        if (convError) console.error('[webhook] conversation error:', convError)
        if (!conversation) continue

        // Insere a mensagem (evita duplicatas pelo meta_message_id)
        const { error: msgError } = await supabase.from('messages').upsert(
          {
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            direction: 'inbound',
            body,
            media_type: mediaType,
            media_id: mediaId,
            status: 'delivered',
            timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
            sent_by: 'system',
            meta_message_id: msg.id,
          },
          { onConflict: 'meta_message_id', ignoreDuplicates: true }
        )
        if (msgError) console.error('[webhook] message error:', msgError)

        // Atualiza last_message_at da conversa
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date(Number(msg.timestamp) * 1000).toISOString() })
          .eq('id', conversation.id)

        // Encaminha para o webhook do n8n do cliente (não bloqueia a resposta)
        const n8nUrl = (tenant as { id: string; n8n_webhook_url?: string }).n8n_webhook_url
        if (n8nUrl) {
          fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(change.value),
          }).catch(err => console.error('[webhook] n8n forward error:', err))
        }
      }

      // -------------------------------------------------------
      // Status updates (enviado, entregue, lido)
      // -------------------------------------------------------
      for (const statusUpdate of value.statuses ?? []) {
        await supabase
          .from('messages')
          .update({ status: statusUpdate.status })
          .eq('meta_message_id', statusUpdate.id)
          .eq('tenant_id', tenant.id)
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}
