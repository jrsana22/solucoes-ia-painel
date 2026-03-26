'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tenant } from '@/types'
import TenantForm from '@/components/TenantForm'

export default function ClientesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  const fetchTenants = async () => {
    const res = await fetch('/api/tenants')
    const data = await res.json()
    setTenants(data.tenants ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTenants() }, [])

  const handleSuccess = (tenant: Tenant) => {
    setTenants(prev => {
      const exists = prev.find(t => t.id === tenant.id)
      if (exists) return prev.map(t => t.id === tenant.id ? tenant : t)
      return [tenant, ...prev]
    })
    setShowForm(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará todas as conversas e mensagens deste cliente.')) return
    setDeleting(id)
    await fetch(`/api/tenants/${id}`, { method: 'DELETE' })
    setTenants(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os clientes e suas conexões com a Meta WhatsApp API
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo cliente
        </button>
      </div>

      {/* Modal de formulário */}
      {(showForm || editing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {editing ? 'Editar cliente' : 'Novo cliente'}
            </h2>
            <TenantForm
              initial={editing ?? undefined}
              onSuccess={handleSuccess}
              onCancel={() => { setShowForm(false); setEditing(null) }}
            />
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Nenhum cliente cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Novo cliente" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map(tenant => (
            <div
              key={tenant.id}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                {tenant.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{tenant.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                  Phone ID: {tenant.meta_phone_number_id}
                </p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push(`/dashboard?tenant=${tenant.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition"
                  title="Ver conversas"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Conversas
                </button>
                <button
                  onClick={() => setEditing(tenant)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                  title="Editar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(tenant.id)}
                  disabled={deleting === tenant.id}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                  title="Excluir"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
