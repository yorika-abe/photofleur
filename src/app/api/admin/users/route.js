import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await admin
    .from('user_profiles')
    .select('id, name, email, roles, role, created_at, registered_via_invite, invite_notif_seen, is_blocked')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: models } = await admin
    .from('models')
    .select('id, user_id')

  const modelIds = (models || []).map(m => m.id)
  const { data: modelPrivateInfos } = modelIds.length > 0
    ? await admin.from('model_private_info').select('model_id, real_name').in('model_id', modelIds)
    : { data: [] }

  const { data: staffInfos } = await admin
    .from('staff_private_info')
    .select('user_id, display_name, real_name')

  const modelIdByUserId = Object.fromEntries((models || []).map(m => [m.user_id, m.id]))
  const modelRealNameByModelId = Object.fromEntries((modelPrivateInfos || []).map(m => [m.model_id, m.real_name || null]))
  const staffNameByUserId = Object.fromEntries((staffInfos || []).map(s => [s.user_id, s.display_name || s.real_name || null]))

  const normalized = (data || []).map(u => {
    const roles = u.roles?.length > 0 ? u.roles : (u.role ? [u.role] : ['photographer'])
    let displayName = u.name || null
    if (roles.includes('staff')) displayName = staffNameByUserId[u.id] || displayName
    if (roles.includes('model')) {
      const modelId = modelIdByUserId[u.id]
      displayName = (modelId && modelRealNameByModelId[modelId]) || displayName
    }
    return { ...u, roles, display_name: displayName }
  })
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
