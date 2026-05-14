import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: allProfiles } = await admin.from('user_profiles').select('id, name, roles, role, email')
  const staffProfiles = (allProfiles || []).filter(p => {
    const roles = p.roles?.length > 0 ? p.roles : (p.role ? [p.role] : [])
    return roles.includes('staff')
  })

  const staffIds = staffProfiles.map(p => p.id)
  let infosMap = {}
  if (staffIds.length > 0) {
    const { data: infos } = await admin.from('staff_private_info').select('*').in('user_id', staffIds)
    for (const info of infos || []) infosMap[info.user_id] = info
  }

  return Response.json({
    staff: staffProfiles.map(p => ({ ...p, info: infosMap[p.id] || null }))
  })
}

export async function PATCH(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, user_id, changes } = await req.json()

  if (action === 'approve_changes') {
    const { data: info } = await admin.from('staff_private_info').select('pending_changes').eq('user_id', user_id).single()
    if (!info?.pending_changes) return Response.json({ error: 'no pending changes' }, { status: 400 })
    await admin.from('staff_private_info').update({ ...info.pending_changes, pending_changes: null, updated_at: new Date().toISOString() }).eq('user_id', user_id)
    return Response.json({ ok: true })
  }

  if (action === 'reject_changes') {
    await admin.from('staff_private_info').update({ pending_changes: null }).eq('user_id', user_id)
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'invalid action' }, { status: 400 })
}
