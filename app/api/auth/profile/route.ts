import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/auth/profile — retorna perfil do usuário logado
export async function GET() {
  const cookieStore = await cookies()

  let userId: string | null = null
  try {
    // Cookie name: sb-yhlzrmnuikvvuppwmbxu-auth-token
    // Cookie value format: "base64-{base64url encoded JSON with access_token field}"
    const authCookie = cookieStore.getAll().find(c => c.name.includes('auth-token'))

    if (authCookie?.value) {
      let raw = authCookie.value

      // Supabase v2.99+ format: "base64-<base64url encoded JSON>"
      if (raw.startsWith('base64-')) {
        raw = Buffer.from(raw.slice(7), 'base64url').toString('utf8')
      } else {
        try { raw = decodeURIComponent(raw) } catch { /* ignore */ }
      }

      const parsed = JSON.parse(raw)
      const accessToken = parsed.access_token

      if (typeof accessToken === 'string') {
        const parts = accessToken.split('.')
        if (parts.length === 3) {
          // JWT payload is base64url encoded
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
          userId = payload.sub ?? null
        }
      }
    }
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const { data: profile, error } = await serviceClient
    .from('profiles')
    .select('id, name, role, tenant_id')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ profile })
}
