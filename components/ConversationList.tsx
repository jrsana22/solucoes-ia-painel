'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Conversation } from '@/types'
import { contactLabel, avatarChar } from '@/lib/formatPhone'

interface ConversationListProps {
  tenantId: string
  selectedId: string | null
  onSelect: (conversation: Conversation) => void
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return date.toLocaleDateString('pt-BR', { weekday: 'short' })
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ConversationList({ tenantId, selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?tenant_id=${tenantId}`)
      if (!res.ok) return
      const json = await res.json()
      if (json.conversations) setConversations(json.conversations as Conversation[])
    } catch {
      // ignora erros de rede
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    const interval = setInterval(fetchConversations, 15000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = c.contact?.name?.toLowerCase() ?? ''
    const phone = c.contact?.phone?.toLowerCase() ?? ''
    return name.includes(q) || phone.includes(q)
  })

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/10"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <svg className="animate-spin w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10 px-4">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhuma conversa ainda.'}
          </p>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId
            const label = contactLabel(conv.contact?.name, conv.contact?.phone)
            const avatar = avatarChar(conv.contact?.name, conv.contact?.phone)
            const preview = conv.last_message?.body
            const time = conv.last_message_at ? timeAgo(conv.last_message_at) : ''
            const isInbound = conv.last_message?.direction === 'inbound'

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-white/10 border-b border-white/5 ${
                  isSelected ? 'bg-white/20' : ''
                }`}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-white font-semibold text-sm border border-white/10">
                  {avatar}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white font-medium text-sm truncate">{label}</span>
                    <span className="text-white/40 text-[11px] flex-shrink-0">{time}</span>
                  </div>
                  {preview && (
                    <p className="text-white/40 text-xs truncate mt-0.5">
                      {!isInbound && <span className="text-white/30">Você: </span>}
                      {preview}
                    </p>
                  )}
                </div>

                {conv.status === 'open' && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
