'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Conversation, Message } from '@/types'
import MessageBubble from './MessageBubble'
import ReplyBox from './ReplyBox'

interface ConversationThreadProps {
  conversation: Conversation
  tenantId: string
  onDelete?: () => void
  onBack?: () => void
}

function formatDateLabel(timestamp: string): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function getDateKey(timestamp: string): string {
  return new Date(timestamp).toDateString()
}

export default function ConversationThread({ conversation, tenantId, onDelete, onBack }: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const contact = conversation.contact

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Carrega mensagens iniciais
  useEffect(() => {
    setLoading(true)
    setMessages([])

    fetch(`/api/messages?conversation_id=${conversation.id}&tenant_id=${tenantId}`)
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(json => {
        setMessages(json.messages ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [conversation.id, tenantId])

  // Scroll para o final ao carregar
  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, scrollToBottom])

  // Polling inteligente: só adiciona mensagens novas, nunca substitui
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?conversation_id=${conversation.id}&tenant_id=${tenantId}`)
        if (!res.ok) return
        const json = await res.json()
        const fetched: Message[] = json.messages ?? []
        if (fetched.length === 0) return

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const added = fetched.filter(m => !existingIds.has(m.id))
          if (added.length === 0) return prev
          setTimeout(() => scrollToBottom(true), 50)
          return [...prev, ...added]
        })
      } catch {
        // ignora erros de rede no polling
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [conversation.id, tenantId, scrollToBottom])

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
      <div className="flex items-center gap-2 px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-white shadow-sm">
        {/* Botão voltar — só aparece no mobile */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition"
            title="Voltar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {contactLabel.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate text-sm md:text-base">{contactLabel}</h2>
          {contact?.phone && contact?.name && (
            <p className="text-xs text-gray-500">{contact.phone}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 md:px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[conversation.status]}`}>
          {statusLabels[conversation.status]}
        </span>
        <button
          onClick={async () => {
            if (!confirm('Excluir esta conversa e todas as mensagens?')) return
            await fetch(`/api/conversations/${conversation.id}`, { method: 'DELETE' })
            onDelete?.()
          }}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
          title="Excluir conversa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
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
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1]
              const showDateSeparator = !prevMsg || getDateKey(msg.timestamp) !== getDateKey(prevMsg.timestamp)

              return (
                <div key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 px-4 my-3">
                      <div className="flex-1 h-px bg-gray-300/60" />
                      <span className="text-[11px] text-gray-500 font-medium bg-[#f0f2f5] px-2 py-0.5 rounded-full border border-gray-300/50 whitespace-nowrap">
                        {formatDateLabel(msg.timestamp)}
                      </span>
                      <div className="flex-1 h-px bg-gray-300/60" />
                    </div>
                  )}
                  <MessageBubble message={msg} />
                </div>
              )
            })}
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
