import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const cookieNames = allCookies.map(c => c.name)

  let userId: string | null = null
  let parseError: string | null = null

  try {
    const authCookie = allCookies.find(c => c.name.includes('auth-token'))
    if (authCookie?.value) {
      let raw = authCookie.value
      try { raw = decodeURIComponent(raw) } catch {}
      const parsed = JSON.parse(raw)
      const accessToken = parsed.access_token
      if (typeof accessToken === 'string') {
        const parts = accessToken.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
          userId = payload.sub ?? null
        }
      }
    }
  } catch (e) {
    parseError = String(e)
  }

  return NextResponse.json({ cookieNames, userId, parseError })
}
