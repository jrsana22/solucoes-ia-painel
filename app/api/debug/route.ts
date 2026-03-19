import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const cookieNames = cookieStore.getAll().map(c => c.name)

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  return NextResponse.json({
    cookieNames,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    authError: error?.message ?? null,
  })
}
