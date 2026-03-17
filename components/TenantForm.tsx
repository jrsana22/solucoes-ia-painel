'use client'

import { useState } from 'react'
import type { Tenant } from '@/types'

interface TenantFormProps {
  initial?: Partial<Tenant>
  onSuccess: (tenant: Tenant) => void
  onCancel: () => void
}

export default function TenantForm({ initial, onSuccess, onCancel }: TenantFormProps) {
  const isEditing = !!initial?.id
  const [name, setName] = useState(initial?.name ?? '')
  const [phoneId, setPhoneId] = useState(initial?.meta_phone_number_id ?? '')
  const [token, setToken] = useState('')
  const [n8nUrl, setN8nUrl] = useState(initial?.n8n_webhook_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !phoneId.trim() || (!isEditing && !token.trim())) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)

    try {
      const url = isEditing ? `/api/tenants/${initial.id}` : '/api/tenants'
      const method = isEditing ? 'PATCH' : 'POST'

      const body: Record<string, string> = {
        name: name.trim(),
        meta_phone_number_id: phoneId.trim(),
      }
      if (token.trim()) body.meta_access_token = token.trim()
      if (n8nUrl.trim()) body.n8n_webhook_url = n8nUrl.trim()

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')

      onSuccess(data.tenant)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nome do cliente <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Clínica Saúde Total"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Phone Number ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Phone Number ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={phoneId}
          onChange={e => setPhoneId(e.target.value)}
          placeholder="Ex: 123456789012345"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">
          Meta Developer Console → WhatsApp → Phone Numbers → ID do número
        </p>
      </div>

      {/* Access Token */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Access Token {!isEditing && <span className="text-red-500">*</span>}
          {isEditing && <span className="text-gray-400 font-normal"> (deixe em branco para manter o atual)</span>}
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={isEditing ? '••••••••••••••••' : 'EAAxxxxxxxx...'}
            className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowToken(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showToken ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Meta Developer Console → System User → Generate Token (token permanente)
        </p>
      </div>

      {/* Webhook n8n */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Webhook do Agente IA (n8n)
          <span className="text-gray-400 font-normal ml-1">(opcional)</span>
        </label>
        <input
          type="url"
          value={n8nUrl}
          onChange={e => setN8nUrl(e.target.value)}
          placeholder="https://seu-n8n.com/webhook/..."
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">
          Quando o contato responder, a mensagem será encaminhada para este webhook automaticamente
        </p>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Adicionar cliente'}
        </button>
      </div>
    </form>
  )
}
