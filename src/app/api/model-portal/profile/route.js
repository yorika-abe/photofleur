import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { deleteFromR2 } from '@/lib/r2'
import { notifyAdmin } from '@/lib/notify-admin'

async function getAuthUser() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['model', 'admin'].includes(r))) return { error: 'Forbidden', status: 403 }
  return { user, admin, roles }
}

export async function GET(req) {
  const result = await getAuthUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { user, admin, roles } = result

  // Admin: if model_id param provided, return that model; else return all models
  // ただしadmin+model両方持つ場合はmodel_idがない時は自分のモデルページを表示
  if (roles?.includes('admin')) {
    const { searchParams } = new URL(req.url)
    const modelId = searchParams.get('model_id')
    if (modelId) {
      const { data: model } = await admin.from('models').select('*').eq('id', modelId).single()
      return Response.json({ model: model || null })
    }
    if (roles?.includes('model')) {
      const { data: ownModel } = await admin.from('models').select('*').eq('user_id', user.id).single()
      if (ownModel) return Response.json({ model: ownModel })
    }
    const { data: models } = await admin.from('models').select('id, name, image, status').order('name')
    return Response.json({ model: null, allModels: models || [] })
  }

  const { data: model } = await admin.from('models').select('*').eq('user_id', user.id).single()
  return Response.json({ model: model || null })
}

export async function PUT(req) {
  const result = await getAuthUser()
  if (result.error) return Response.json({ error: result.error }, { status: result.status })
  const { user, admin } = result
  const body = await req.json()

  const { data: existing } = await admin.from('models').select('*').eq('user_id', user.id).single()
  if (!existing) return Response.json({ error: 'モデルレコードが見つかりません' }, { status: 404 })

  // 前の pending_data で使っていた画像が今回の申請で変わる場合はR2から削除
  const basePending = existing.pending_data || {}
  if (body.image !== undefined && basePending.image && basePending.image !== body.image && basePending.image !== existing.image) {
    await deleteFromR2([basePending.image])
  }
  if (body.portfolio_images !== undefined && basePending.portfolio_images) {
    const newSet = new Set(body.portfolio_images || [])
    const toDelete = (basePending.portfolio_images || []).filter(u => !newSet.has(u) && u !== (existing.portfolio_images || []).find(x => x === u))
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }

  const mergedPending = { ...basePending, ...body }
  const updateData = { pending_data: mergedPending }
  if (existing.status !== 'active') updateData.status = 'pending'

  const { error } = await admin.from('models').update(updateData).eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  await notifyAdmin(admin, 'admin_profile_change').catch(() => {})
  return Response.json({ ok: true, status: 'pending' })
}
