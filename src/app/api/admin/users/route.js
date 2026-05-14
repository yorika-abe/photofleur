import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await admin
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
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { userId, roles, is_blocked } = body
  const updateData = {}
  if (roles !== undefined) updateData.roles = roles
  if (is_blocked !== undefined) updateData.is_blocked = is_blocked
  const { error } = await admin.from('user_profiles').update(updateData).eq('id', userId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
