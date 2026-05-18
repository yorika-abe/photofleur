import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role, roles').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return null
  return admin
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await admin
    .from('site_settings')
    .select('key, value')
    .in('key', [
      'line_group_id_all',
      'line_group_id_zatsudan',
      'line_group_id_staff',
      'line_group_id_admin',
      'line_staff_ids',
      'line_model_ids',
      'line_group_id_last_joined_modeful',
      'line_group_id_last_joined_official',
    ])

  const settings = Object.fromEntries((rows || []).map(r => [r.key, r.value]))

  const { data: models } = await admin
    .from('models')
    .select('id, name, image')
    .eq('status', 'active')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  const { data: staffProfiles } = await admin
    .from('user_profiles')
    .select('id, name, email')
    .contains('roles', ['staff'])
    .order('name', { ascending: true })

  let staffLineIds = {}
  try { staffLineIds = JSON.parse(settings.line_staff_ids || '{}') } catch {}
  let modelLineIds = {}
  try { modelLineIds = JSON.parse(settings.line_model_ids || '{}') } catch {}

  return Response.json({
    group_all: settings.line_group_id_all || '',
    group_zatsudan: settings.line_group_id_zatsudan || '',
    group_staff: settings.line_group_id_staff || '',
    group_admin: settings.line_group_id_admin || '',
    last_joined_modeful: settings.line_group_id_last_joined_modeful || '',
    last_joined_official: settings.line_group_id_last_joined_official || '',
    models: (models || []).map(m => ({ ...m, line_id: modelLineIds[m.id] || '' })),
    staff: (staffProfiles || []).map(u => ({ ...u, line_id: staffLineIds[u.id] || '' })),
  })
}

export async function PUT(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { group_all, group_zatsudan, group_staff, group_admin, model_line_ids, staff_line_ids } = await req.json()

  const upserts = []
  if (group_all !== undefined) upserts.push({ key: 'line_group_id_all', value: group_all })
  if (group_zatsudan !== undefined) upserts.push({ key: 'line_group_id_zatsudan', value: group_zatsudan })
  if (group_staff !== undefined) upserts.push({ key: 'line_group_id_staff', value: group_staff })
  if (group_admin !== undefined) upserts.push({ key: 'line_group_id_admin', value: group_admin })
  if (staff_line_ids !== undefined) upserts.push({ key: 'line_staff_ids', value: JSON.stringify(staff_line_ids) })

  if (model_line_ids && typeof model_line_ids === 'object') {
    upserts.push({ key: 'line_model_ids', value: JSON.stringify(model_line_ids) })
  }

  if (upserts.length > 0) {
    await admin.from('site_settings').upsert(upserts, { onConflict: 'key' })
  }

  // models.line_id にも同期（通知API互換性のため）
  if (model_line_ids && typeof model_line_ids === 'object') {
    for (const [modelId, lineId] of Object.entries(model_line_ids)) {
      await admin.from('models').update({ line_id: lineId || null }).eq('id', modelId)
    }
  }

  return Response.json({ ok: true })
}
