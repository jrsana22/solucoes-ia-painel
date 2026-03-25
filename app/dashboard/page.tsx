'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Conversation, Tenant } from '@/types'
import ConversationList from '@/components/ConversationList'
import ConversationThread from '@/components/ConversationThread'

interface Profile {
  id: string
  name: string
  role: 'admin' | 'agent'
  tenant_id: string | null
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tenantIdParam = searchParams.get('tenant')

  const [selected, setSelected] = useState<Conversation | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  // Carrega perfil do usuário logado
  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => {
        if (r.status === 401) { window.location.replace('/logout'); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        if (data.profile) setProfile(data.profile)
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Carrega tenants com base no perfil
  useEffect(() => {
    if (!profile) return

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch('/api/tenants', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        clearTimeout(timeout)
        const all: Tenant[] = data.tenants ?? []
        if (profile.role === 'agent' && profile.tenant_id) {
          const own = all.find(t => t.id === profile.tenant_id)
          if (own) { setTenants([own]); setTenant(own) }
        } else {
          setTenants(all)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    return () => { clearTimeout(timeout); controller.abort() }
  }, [profile])

  // Admin: define tenant ativo pela URL ou pelo primeiro da lista
  useEffect(() => {
    if (!profile || profile.role !== 'admin' || tenants.length === 0) return

    if (tenantIdParam) {
      const found = tenants.find(t => t.id === tenantIdParam)
      setTenant(found ?? tenants[0])
    } else {
      router.replace(`/dashboard?tenant=${tenants[0].id}`)
    }
  }, [tenantIdParam, tenants, profile, router])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#f0f2f5' }}>
        <svg className="animate-spin w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  if (tenants.length === 0) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#f0f2f5' }}>
        <div className="text-center max-w-sm px-4">
          <p className="text-gray-700 font-semibold text-lg">Nenhum cliente cadastrado</p>
          {profile?.role === 'admin' && (
            <>
              <p className="text-gray-400 text-sm mt-1 mb-5">Cadastre o primeiro cliente para começar.</p>
              <button
                onClick={() => router.push('/dashboard/clientes')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Cadastrar cliente
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!tenant) return null

  return (
    <div className="flex h-full">
      {/* Sidebar — ocupa tela cheia no mobile quando nenhuma conversa selecionada */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r border-white/10 bg-[#1a2f3a] transition-all
          ${selected ? 'hidden md:flex md:w-80' : 'flex w-full md:w-80'}
        `}
      >
        {/* Seletor de agente — admin sempre vê dropdown */}
        {profile?.role === 'admin' && (
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
                <option key={t.id} value={t.id} className="bg-[#1a2f3a] text-white">{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {profile?.role === 'agent' && (
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

      {/* Main — ocupa tela cheia no mobile quando conversa selecionada */}
      <main
        className={`flex-col overflow-hidden bg-white
          ${selected ? 'flex w-full md:flex-1' : 'hidden md:flex md:flex-1'}
        `}
      >
        {selected ? (
          <ConversationThread
            key={selected.id}
            conversation={selected}
            tenantId={tenant.id}
            onDelete={() => setSelected(null)}
            onBack={() => setSelected(null)}
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
