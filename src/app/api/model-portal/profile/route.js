import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

async function getModelUser(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'model') return { error: 'Forbidden', status: 403 }
  return { user, admin }
}

export async function GET() {
  const result = await getModelUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { user, admin } = result
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
