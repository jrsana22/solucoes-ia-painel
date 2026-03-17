import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { id } = params

  await supabase.from('messages').delete().eq('conversation_id', id)
  const { error } = await supabase.from('conversations').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
