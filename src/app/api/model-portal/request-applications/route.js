import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { notifyAdmin } from '@/lib/notify-admin'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: model } = await admin.from('models').select('id').eq('user_id', user.id).maybeSingle()
  if (!model) return Response.json({ applications: [] })

  // このモデルが選ばれた申請
  const { data: appModels } = await admin
    .from('request_application_models')
    .select('id, application_id, notified_at')
    .eq('model_id', model.id)

  if (!appModels?.length) return Response.json({ applications: [] })

  const appIds = appModels.map(m => m.application_id)
  const appModelMap = Object.fromEntries(appModels.map(m => [m.application_id, m]))

  const { data: apps } = await admin
    .from('request_applications')
    .select('id, status, created_at, location, nickname, sns_url, last_name, first_name, notes')
    .in('id', appIds)
    .in('status', ['notified', 'model_responded', 'staff_recruiting'])
    .order('created_at', { ascending: false })

  if (!apps?.length) return Response.json({ applications: [] })

  const { data: prefs } = await admin
    .from('request_date_preferences')
    .select('*')
    .in('application_id', appIds)
    .order('preference_order')

  // このモデルの回答済み確認
  const appModelIds = appModels.map(m => m.id)
  const { data: responses } = await admin
    .from('model_request_responses')
    .select('application_model_id, preference_order')
    .in('application_model_id', appModelIds)

  const respondedAppModelIds = new Set((responses || []).map(r => r.application_model_id))

  const enriched = apps.map(a => {
    const appModel = appModelMap[a.id]
    const responded = appModel ? respondedAppModelIds.has(appModel.id) : false
    return {
      ...a,
      application_model_id: appModel?.id,
      responded,
      preferences: (prefs || []).filter(p => p.application_id === a.id),
      deadline: appModel?.notified_at
        ? new Date(new Date(appModel.notified_at).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null,
    }
  })

  return Response.json({ applications: enriched })
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: model } = await admin.from('models').select('id').eq('user_id', user.id).maybeSingle()
  if (!model) return Response.json({ error: 'モデルが見つかりません' }, { status: 404 })

  const { application_model_id, responses, transport_fee } = await req.json()
  if (!application_model_id || !responses?.length) {
    return Response.json({ error: '回答データが不足しています' }, { status: 400 })
  }

  // 権限確認
  const { data: appModel } = await admin
    .from('request_application_models')
    .select('id, application_id')
    .eq('id', application_model_id)
    .eq('model_id', model.id)
    .maybeSingle()
  if (!appModel) return Response.json({ error: '権限がありません' }, { status: 403 })

  // 既存回答を削除して再挿入
  await admin.from('model_request_responses').delete().eq('application_model_id', application_model_id)
  await admin.from('model_request_responses').insert(
    responses.map(r => ({
      application_model_id,
      preference_order: r.preference_order,
      status: r.status,
      available_from: r.available_from || null,
      available_until: r.available_until || null,
      transport_fee: transport_fee ? parseInt(transport_fee) : null,
    }))
  )

  // 申請ステータス更新（全モデルが回答済みかチェック）
  const { data: allAppModels } = await admin
    .from('request_application_models')
    .select('id')
    .eq('application_id', appModel.application_id)
  const allIds = (allAppModels || []).map(m => m.id)
  const { data: allResponses } = await admin
    .from('model_request_responses')
    .select('application_model_id')
    .in('application_model_id', allIds)
  const respondedIds = new Set((allResponses || []).map(r => r.application_model_id))
  const allResponded = allIds.every(id => respondedIds.has(id))
  if (allResponded) {
    await admin.from('request_applications').update({ status: 'model_responded' }).eq('id', appModel.application_id)
    await notifyAdmin(admin, 'admin_request_all_responded').catch(() => {})
  }

  return Response.json({ ok: true })
}
