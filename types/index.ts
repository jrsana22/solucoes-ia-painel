export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type MessageSentBy = 'agent' | 'human' | 'system'
export type ConversationStatus = 'open' | 'closed' | 'pending'

export interface Tenant {
  id: string
  name: string
  meta_phone_number_id: string
  meta_access_token: string
  n8n_webhook_url: string | null
  created_at: string
}

export interface Contact {
  id: string
  tenant_id: string
  phone: string
  name: string | null
  created_at: string
}

export interface Conversation {
  id: string
  tenant_id: string
  contact_id: string
  status: ConversationStatus
  last_message_at: string
  created_at: string
  // joined
  contact?: Contact
  last_message?: Message
}

export interface Message {
  id: string
  conversation_id: string
  tenant_id: string
  direction: MessageDirection
  body: string
  status: MessageStatus
  timestamp: string
  sent_by: MessageSentBy
  meta_message_id: string | null
  created_at: string
}
