'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Conversation, Tenant } from '@/types'
import ConversationList from '@/components/ConversationList'
import ConversationThread from '@/components/ConversationThread'

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tenantId = searchParams.get('tenant')

  const [selected, setSelected] = useState<Conversation | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(true)

  // Carrega lista de tenants
  useEffect(() => {
    fetch('/api/tenants')
      .then(r => r.json())
      .then(data => {
        setTenants(data.tenants ?? [])
        setLoadingTenants(false)
      })
  }, [])

  // Quando tenants carregam: se não tem tenant na URL, redireciona para o primeiro
  useEffect(() => {
    if (loadingTenants) return
    if (tenantId) {
      const found = tenants.find(t => t.id === tenantId)
      setTenant(found ?? null)
    } else if (tenants.length > 0) {
      router.replace(`/dashboard?tenant=${tenants[0].id}`)
    }
  }, [tenantId, tenants, loadingTenants, router])

  // Sem tenants cadastrados
  if (!loadingTenants && tenants.length === 0) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#f0f2f5' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-lg">Nenhum cliente cadastrado</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Cadastre o primeiro cliente para começar a usar o painel.</p>
          <button
            onClick={() => router.push('/dashboard/clientes')}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Cadastrar cliente
          </button>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#f0f2f5' }}>
        <svg className="animate-spin w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — lista de conversas */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-white/10 bg-[#1a2f3a]">
        {/* Seletor de cliente */}
        {tenants.length > 1 && (
          <div className="px-3 pt-3 pb-1">
            <select
              value={tenant.id}
              onChange={e => {
                setSelected(null)
                router.push(`/dashboard?tenant=${e.target.value}`)
              }}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-xs border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id} className="bg-[#1a2f3a] text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {tenants.length === 1 && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-white/60 text-xs truncate">{tenant.name}</p>
          </div>
        )}

        <ConversationList
          tenantId={tenant.id}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </aside>

      {/* Painel principal — thread da conversa */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {selected ? (
          <ConversationThread
            key={selected.id}
            conversation={selected}
            tenantId={tenant.id}
          />
        ) : (
          <div className="flex h-full items-center justify-center" style={{ background: '#f0f2f5' }}>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Selecione uma conversa</p>
              <p className="text-gray-400 text-sm mt-1">Escolha à esquerda para ver as mensagens</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}
