'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Conversation, Message } from '@/types'
import MessageBubble from './MessageBubble'
import ReplyBox from './ReplyBox'

interface ConversationThreadProps {
  conversation: Conversation
  tenantId: string
}

export default function ConversationThread({ conversation, tenantId }: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const contact = conversation.contact

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Carrega histórico de mensagens
  useEffect(() => {
    setLoading(true)
    setMessages([])

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? [])
        setLoading(false)
      })
  }, [conversation.id, tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll para o final ao carregar
  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, scrollToBottom])

  // Realtime — escuta novas mensagens e atualizações de status
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Evita duplicatas
            if (prev.find((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setTimeout(() => scrollToBottom(true), 50)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updated = payload.new as Message
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation.id, tenantId, scrollToBottom]) // eslint-disable-line react-hooks/exhaustive-deps

  const contactLabel = contact?.name ?? contact?.phone ?? 'Contato'
  const statusColors: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-500',
  }
  const statusLabels: Record<string, string> = {
    open: 'Aberta',
    pending: 'Pendente',
    closed: 'Encerrada',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header da conversa */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {contactLabel.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{contactLabel}</h2>
          {contact?.phone && contact?.name && (
            <p className="text-xs text-gray-500">{contact.phone}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[conversation.status]}`}>
          {statusLabels[conversation.status]}
        </span>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto py-4" style={{ background: '#f0f2f5' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="animate-spin w-6 h-6 text-gray-400 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-gray-400">Carregando mensagens…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Nenhuma mensagem ainda.</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Caixa de resposta */}
      <ReplyBox
        conversationId={conversation.id}
        tenantId={tenantId}
      />
    </div>
  )
}
