import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}

export async function GET(req: import('next/server').NextRequest) {
  try { const supabase = await createClient(); await supabase.auth.signOut() } catch { /* ignora */ }
  const res = NextResponse.redirect('https://solucoes-ia-painel.vercel.app/login')
  // Apaga todos os cookies que existem na requisição
  req.cookies.getAll().forEach(c => {
    res.cookies.set(c.name, '', { maxAge: 0, path: '/' })
  })
  return res
}
