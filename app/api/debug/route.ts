import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  let userId: string | null = null
  let decodedPreview: string | null = null
  let parseError: string | null = null
  let hasAccessToken = false

  try {
    const authCookie = allCookies.find(c => c.name.includes('auth-token'))
    if (authCookie?.value) {
      let raw = authCookie.value

      if (raw.startsWith('base64-')) {
        raw = Buffer.from(raw.slice(7), 'base64url').toString('utf8')
      } else {
        try { raw = decodeURIComponent(raw) } catch {}
      }

      decodedPreview = raw.slice(0, 120) + '...'

      const parsed = JSON.parse(raw)
      hasAccessToken = !!parsed.access_token

      const accessToken = parsed.access_token
      if (typeof accessToken === 'string') {
        const parts = accessToken.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
          userId = payload.sub ?? null
        }
      }
    }
  } catch (e) {
    parseError = String(e)
  }

  return NextResponse.json({ userId, decodedPreview, hasAccessToken, parseError })
}
