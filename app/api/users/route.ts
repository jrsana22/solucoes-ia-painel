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
  let body: {
    name: string
    email: string
    password: string
    role: 'admin' | 'agent'
    meta_phone_number_id?: string
    meta_access_token?: string
    n8n_webhook_url?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { name, email, password, role, meta_phone_number_id, meta_access_token, n8n_webhook_url } = body

  if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  if (role === 'agent' && (!meta_phone_number_id?.trim() || !meta_access_token?.trim())) {
    return NextResponse.json({ error: 'Phone Number ID e Access Token são obrigatórios para agente' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const supabase = createServiceClient()

  // Para agente: cria o tenant primeiro com as credenciais Meta
  let tenantId: string | null = null
  if (role === 'agent') {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: name.trim(),
        meta_phone_number_id: meta_phone_number_id!.trim(),
        meta_access_token: meta_access_token!.trim(),
        n8n_webhook_url: n8n_webhook_url?.trim() || null,
      })
      .select('id')
      .single()

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 })
    }
    tenantId = tenant.id
  }

  // Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true,
  })

  if (authError) {
    if (tenantId) await supabase.from('tenants').delete().eq('id', tenantId)
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // Cria perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      name: name.trim(),
      role,
      tenant_id: tenantId,
    })
    .select('id, name, role, tenant_id, created_at')
    .single()

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId)
    if (tenantId) await supabase.from('tenants').delete().eq('id', tenantId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ user: profile }, { status: 201 })
}
