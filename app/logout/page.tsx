'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LogoutPage() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    )
    supabase.auth.signOut().finally(() => {
      // Limpa localStorage e sessionStorage também
      localStorage.clear()
      sessionStorage.clear()
      window.location.replace('/login')
    })
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666' }}>Saindo…</p>
    </div>
  )
}
