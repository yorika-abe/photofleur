import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { event_id } = await req.json()

  // Clear all featured
  await admin.from('events').update({ is_featured: false }).not('id', 'is', null)

  if (event_id) {
    const { error } = await admin.from('events').update({ is_featured: true }).eq('id', event_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
