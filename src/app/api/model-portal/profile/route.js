import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

async function getAuthUser() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'model' && profile?.role !== 'admin') return { error: 'Forbidden', status: 403 }
  return { user, admin, role: profile?.role }
}

export async function GET(req) {
  const result = await getAuthUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { user, admin, role } = result

  // Admin: if model_id param provided, return that model; else return all models
  if (role === 'admin') {
    const { searchParams } = new URL(req.url)
    const modelId = searchParams.get('model_id')
    if (modelId) {
      const { data: model } = await admin.from('models').select('*').eq('id', modelId).single()
      return Response.json({ model: model || null })
    }
    const { data: models } = await admin.from('models').select('id, name, image, status').order('name')
    return Response.json({ model: null, allModels: models || [] })
  }

  const { data: model } = await admin.from('models').select('*').eq('user_id', user.id).single()
  return Response.json({ model: model || null })
}

export async function PUT(req) {
  const result = await getModelUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { user, admin } = result
  const body = await req.json()

  const { data: existing } = await admin.from('models').select('id, status').eq('user_id', user.id).single()
  if (!existing) return Response.json({ error: 'モデルレコードが見つかりません' }, { status: 404 })

  const newStatus = existing.status === 'active' ? 'active' : 'pending'

  const { error } = await admin.from('models').update({
    ...body,
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, status: newStatus })
}
