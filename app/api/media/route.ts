import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mediaId = searchParams.get('media_id')
  const tenantId = searchParams.get('tenant_id')

  if (!mediaId || !tenantId) {
    return NextResponse.json({ error: 'media_id e tenant_id obrigatórios' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('meta_access_token')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  const version = process.env.META_API_VERSION ?? 'v17.0'

  // Busca a URL de download do arquivo na Meta
  const metaRes = await fetch(`https://graph.facebook.com/${version}/${mediaId}`, {
    headers: { Authorization: `Bearer ${tenant.meta_access_token}` },
  })

  if (!metaRes.ok) {
    return NextResponse.json({ error: 'Erro ao buscar mídia na Meta' }, { status: 502 })
  }

  const metaData = await metaRes.json()
  const downloadUrl = metaData.url

  if (!downloadUrl) {
    return NextResponse.json({ error: 'URL de mídia não encontrada' }, { status: 404 })
  }

  // Faz o proxy do arquivo
  const fileRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${tenant.meta_access_token}` },
  })

  if (!fileRes.ok) {
    return NextResponse.json({ error: 'Erro ao baixar mídia' }, { status: 502 })
  }

  const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream'
  const buffer = await fileRes.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
