import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return admin
}

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data } = await admin.from('site_settings').select('key, value')
  const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  return Response.json(settings)
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const entries = Object.entries(body).map(([key, value]) => ({
    key, value, updated_at: new Date().toISOString(),
  }))

  const { error } = await admin.from('site_settings').upsert(entries, { onConflict: 'key' })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
