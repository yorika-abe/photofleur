import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = await createSupabaseAdminClient()
    const { data } = await admin.from('site_settings').select('value').eq('key', 'pwa_icon').single()
    if (data?.value) {
      return NextResponse.redirect(data.value, { status: 302 })
    }
  } catch {}
  return new Response(null, { status: 404 })
}
