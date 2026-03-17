const API_VERSION = process.env.META_API_VERSION ?? 'v17.0'

interface SendTextMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string        // número do destinatário com código do país, ex: 5511999999999
  body: string
}

interface MetaMessageResponse {
  messaging_product: string
  contacts: { input: string; wa_id: string }[]
  messages: { id: string }[]
}

// Envia uma mensagem de texto via Meta WhatsApp Business API
export async function sendTextMessage({
  phoneNumberId,
  accessToken,
  to,
  body,
}: SendTextMessageParams): Promise<MetaMessageResponse> {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(
      `Meta API error ${res.status}: ${JSON.stringify(error)}`
    )
  }

  return res.json()
}

// Estrutura de um payload de webhook recebido da Meta
export interface MetaWebhookPayload {
  object: string
  entry: {
    id: string
    changes: {
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: {
          profile: { name: string }
          wa_id: string
        }[]
        messages?: {
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          audio?: { id: string; mime_type?: string }
          image?: { id: string; caption?: string; mime_type?: string }
          document?: { id: string; filename?: string; mime_type?: string }
          sticker?: { id: string; mime_type?: string }
        }[]
        statuses?: {
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
        }[]
      }
      field: string
    }[]
  }[]
}
