import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/users — lista todos os usuários (admin only)
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, tenant_id, created_at, tenants(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data })
}

// POST /api/users — cria novo usuário (admin only)
export async function POST(req: NextRequest) {
  let body: { name: string; email: string; password: string; role: 'admin' | 'agent'; tenant_id?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { name, email, password, role, tenant_id } = body

  if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  if (role === 'agent' && !tenant_id) {
    return NextResponse.json({ error: 'Agente precisa ter um cliente atribuído' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // Cria perfil
  const supabase = createServiceClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      name: name.trim(),
      role,
      tenant_id: role === 'agent' ? tenant_id : null,
    })
    .select('id, name, role, tenant_id, created_at')
    .single()

  if (profileError) {
    // Rollback: remove o usuário criado no Auth
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ user: profile }, { status: 201 })
}
