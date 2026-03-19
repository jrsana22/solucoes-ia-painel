import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  let userId: string | null = null
  try {
    const authCookie = allCookies.find(c => c.name.includes('auth-token'))
    if (authCookie?.value) {
      let raw = authCookie.value
      if (raw.startsWith('base64-')) {
        raw = Buffer.from(raw.slice(7), 'base64url').toString('utf8')
      } else {
        try { raw = decodeURIComponent(raw) } catch {}
      }
      const parsed = JSON.parse(raw)
      const parts = parsed.access_token?.split('.')
      if (parts?.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
        userId = payload.sub ?? null
      }
    }
  } catch {}

  let profile = null
  let dbError = null
  if (userId) {
    try {
      const supabase = createServiceClient()
      const result = await Promise.race([
        supabase.from('profiles').select('id, name, role').eq('id', userId).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]) as { data: unknown; error: unknown }
      profile = result.data
      dbError = result.error ? String(result.error) : null
    } catch (e) {
      dbError = String(e)
    }
  }

  return NextResponse.json({ userId, profile, dbError })
}
