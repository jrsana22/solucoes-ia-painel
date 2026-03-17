'use client'

import { useState } from 'react'
import type { Tenant } from '@/types'

interface UserProfile {
  id: string
  name: string
  role: 'admin' | 'agent'
  tenant_id: string | null
  created_at: string
}

interface UserFormProps {
  initial?: Partial<UserProfile>
  tenants: Tenant[]
  onSuccess: (user: UserProfile) => void
  onCancel: () => void
}

export default function UserForm({ initial, tenants, onSuccess, onCancel }: UserFormProps) {
  const isEditing = !!initial?.id
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'agent'>(initial?.role ?? 'agent')
  const [tenantId, setTenantId] = useState(initial?.tenant_id ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Nome obrigatório'); return }
    if (!isEditing && !email.trim()) { setError('Email obrigatório'); return }
    if (!isEditing && !password.trim()) { setError('Senha obrigatória'); return }
    if (role === 'agent' && !tenantId) { setError('Selecione o cliente do agente'); return }

    setLoading(true)

    try {
      const url = isEditing ? `/api/users/${initial.id}` : '/api/users'
      const method = isEditing ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = { name, role, tenant_id: role === 'agent' ? tenantId : null }
      if (!isEditing) { body.email = email; body.password = password }
      if (isEditing && password.trim()) body.password = password

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')

      onSuccess(data.user)
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nome completo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: João Silva"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="joao@empresa.com"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Senha {!isEditing && <span className="text-red-500">*</span>}
          {isEditing && <span className="text-gray-400 font-normal"> (deixe em branco para manter)</span>}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'}
            className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Perfil <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('agent')}
            className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition text-left ${
              role === 'agent'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Agente</div>
            <div className="text-xs mt-0.5 opacity-70">Acessa 1 cliente</div>
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition text-left ${
              role === 'admin'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Admin</div>
            <div className="text-xs mt-0.5 opacity-70">Acessa todos</div>
          </button>
        </div>
      </div>

      {role === 'agent' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Cliente atribuído <span className="text-red-500">*</span>
          </label>
          <select
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um cliente</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

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
          className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar usuário'}
        </button>
      </div>
    </form>
  )
}
