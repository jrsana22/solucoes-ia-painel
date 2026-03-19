import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes não precisam de autenticação no middleware
  if (pathname.startsWith('/api')) return NextResponse.next()

  // Verifica se existe cookie de sessão do Supabase
  const hasSession = request.cookies.getAll().some(
    c => c.name.includes('auth-token') && c.value.length > 0
  )

  const isAuthRoute = pathname.startsWith('/login')
  const isDashboard = pathname.startsWith('/dashboard')

  if (!hasSession && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
