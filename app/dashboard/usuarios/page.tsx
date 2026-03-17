'use client'

import { useEffect, useState } from 'react'
import type { Tenant } from '@/types'
import UserForm from '@/components/UserForm'

interface UserProfile {
  id: string
  name: string
  role: 'admin' | 'agent'
  tenant_id: string | null
  created_at: string
  tenants?: { name: string } | null
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/tenants').then(r => r.json()),
    ]).then(([usersData, tenantsData]) => {
      setUsers(usersData.users ?? [])
      setTenants(tenantsData.tenants ?? [])
      setLoading(false)
    })
  }, [])

  const handleSuccess = (user: UserProfile & { created_at: string }) => {
    setUsers(prev => {
      const exists = prev.find(u => u.id === user.id)
      if (exists) return prev.map(u => u.id === user.id ? user : u)
      return [user, ...prev]
    })
    setShowForm(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? O usuário perderá o acesso imediatamente.')) return
    setDeleting(id)
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== id))
    setDeleting(null)
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    agent: 'bg-blue-100 text-blue-700',
  }

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    agent: 'Agente',
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie admins e agentes do painel</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo usuário
        </button>
      </div>

      {(showForm || editing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {editing ? 'Editar usuário' : 'Novo usuário'}
            </h2>
            <UserForm
              initial={editing ?? undefined}
              tenants={tenants}
              onSuccess={handleSuccess}
              onCancel={() => { setShowForm(false); setEditing(null) }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-500 font-medium">Nenhum usuário cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Novo usuário" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[user.role]}`}>
                    {roleLabels[user.role]}
                  </span>
                </div>
                {user.role === 'agent' && user.tenants && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    Cliente: {user.tenants.name}
                  </p>
                )}
                {user.role === 'admin' && (
                  <p className="text-xs text-gray-400 mt-0.5">Acesso a todos os clientes</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditing(user)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                  title="Editar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  disabled={deleting === user.id}
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
