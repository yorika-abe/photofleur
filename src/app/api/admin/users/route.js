import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, name, email, roles, role, created_at, registered_via_invite, invite_notif_seen, is_blocked')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const normalized = (data || []).map(u => ({
    ...u,
    roles: u.roles?.length > 0 ? u.roles : (u.role ? [u.role] : ['photographer']),
  }))
  return Response.json(normalized)
}

export async function PATCH(req) {
  const body = await req.json()
  const { userId, roles, is_blocked } = body
  const supabase = await createSupabaseAdminClient()
  const updateData = {}
  if (roles !== undefined) updateData.roles = roles
  if (is_blocked !== undefined) updateData.is_blocked = is_blocked
  const { error } = await supabase.from('user_profiles').update(updateData).eq('id', userId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
