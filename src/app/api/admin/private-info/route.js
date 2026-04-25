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

  const { data: models } = await admin.from('models').select('id, name, image, status').order('name')
  const { data: infos } = await admin.from('model_private_info').select('*')
  const infoByModel = Object.fromEntries((infos || []).map(i => [i.model_id, i]))

  return Response.json({ models: models || [], infos: infoByModel })
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, model_id } = await req.json()

  if (action === 'approve') {
    const { data } = await admin.from('model_private_info').select('pending_changes').eq('model_id', model_id).single()
    if (!data?.pending_changes) return Response.json({ error: 'No pending changes' }, { status: 400 })
    const { error } = await admin.from('model_private_info')
      .update({ ...data.pending_changes, pending_changes: null, updated_at: new Date().toISOString() })
      .eq('model_id', model_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (action === 'reject') {
    const { error } = await admin.from('model_private_info')
      .update({ pending_changes: null, updated_at: new Date().toISOString() })
      .eq('model_id', model_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
