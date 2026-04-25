import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function requireAdmin(server, admin) {
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin') ? user : null
}

export async function GET() {
  const server = await createSupabaseServerClient()
  const admin = await createSupabaseAdminClient()
  const user = await requireAdmin(server, admin)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin.from('feedbacks').select('*').order('created_at', { ascending: false })
  return Response.json(data || [])
}

export async function PATCH(req) {
  const server = await createSupabaseServerClient()
  const admin = await createSupabaseAdminClient()
  const user = await requireAdmin(server, admin)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id, is_read, all_read } = await req.json()
  if (all_read) {
    await admin.from('feedbacks').update({ is_read: true }).eq('is_read', false)
  } else {
    await admin.from('feedbacks').update({ is_read }).eq('id', id)
  }
  return Response.json({ ok: true })
}
