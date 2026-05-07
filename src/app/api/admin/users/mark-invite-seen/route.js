import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin') ? admin : null
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  const { error } = await admin.from('user_profiles').update({ invite_notif_seen: true }).eq('id', userId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
