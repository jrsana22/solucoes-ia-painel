import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/tenants — lista todos os tenants
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, meta_phone_number_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tenants: data })
}

// POST /api/tenants — cria novo tenant
export async function POST(req: NextRequest) {
  let body: { name: string; meta_phone_number_id: string; meta_access_token: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { name, meta_phone_number_id, meta_access_token } = body

  if (!name?.trim() || !meta_phone_number_id?.trim() || !meta_access_token?.trim()) {
    return NextResponse.json(
      { error: 'Nome, Phone Number ID e Access Token são obrigatórios' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      name: name.trim(),
      meta_phone_number_id: meta_phone_number_id.trim(),
      meta_access_token: meta_access_token.trim(),
    })
    .select('id, name, meta_phone_number_id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tenant: data }, { status: 201 })
}
