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

// DELETE /api/users/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PATCH /api/users/[id] — atualiza nome, role, tenant e/ou senha
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: { name?: string; role?: string; tenant_id?: string; password?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const adminClient = createAdminClient()

  // Atualiza senha se fornecida
  if (body.password?.trim()) {
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: body.password.trim(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Atualiza perfil
  const updates: Record<string, unknown> = {}
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.role) updates.role = body.role
  if ('tenant_id' in body) updates.tenant_id = body.role === 'admin' ? null : body.tenant_id

  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, name, role, tenant_id, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data })
  }

  return NextResponse.json({ success: true })
}
