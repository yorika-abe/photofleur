import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage } from '@/lib/line'
import { notifyAdmin } from '@/lib/notify-admin'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ applications: [] })

  const admin = await createSupabaseAdminClient()
  const { data: apps } = await admin
    .from('request_applications')
    .select('id, status, created_at, location, nickname, last_name, first_name, private_product_token')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!apps?.length) return Response.json({ applications: [] })

  // 支払い済み（private_booking作成済み）のトークンを取得して除外
  const tokens = apps.map(a => a.private_product_token).filter(Boolean)
  const paidTokens = new Set()
  if (tokens.length > 0) {
    const { data: products } = await admin.from('private_products').select('id, token').in('token', tokens)
    const productIds = (products || []).map(p => p.id)
    if (productIds.length > 0) {
      const { data: paidBookings } = await admin.from('private_bookings').select('product_id').in('product_id', productIds).is('cancelled_at', null).not('payment_method', 'is', null)
      const paidProductIds = new Set((paidBookings || []).map(b => b.product_id))
      for (const p of (products || [])) {
        if (paidProductIds.has(p.id)) paidTokens.add(p.token)
      }
    }
  }

  const appIds = apps.map(a => a.id)
  const [{ data: prefs }, { data: appModels }] = await Promise.all([
    admin.from('request_date_preferences').select('*').in('application_id', appIds).order('preference_order'),
    admin.from('request_application_models').select('application_id, model_id, models(name)').in('application_id', appIds),
  ])

  const enriched = apps
    .filter(a => !a.private_product_token || !paidTokens.has(a.private_product_token))
    .map(a => ({
      ...a,
      preferences: (prefs || []).filter(p => p.application_id === a.id),
      models: (appModels || []).filter(m => m.application_id === a.id).map(m => ({ model_id: m.model_id, name: m.models?.name })),
    }))

  return Response.json({ applications: enriched })
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'ログインが必要です' }, { status: 401 })

  const body = await req.json()
  const { last_name, first_name, nickname, email, phone, sns_url, location, notes, model_ids, preferences } = body

  if (!last_name || !nickname || !email || !phone || !sns_url || !location) {
    return Response.json({ error: '必須項目を入力してください' }, { status: 400 })
  }
  if (!model_ids?.length) return Response.json({ error: 'モデルを選択してください' }, { status: 400 })
  if (!preferences?.length) return Response.json({ error: '希望日時を入力してください' }, { status: 400 })

  for (const pref of preferences) {
    if (pref.duration_hours < 2) return Response.json({ error: 'リクエスト撮影は2時間から受け付けています' }, { status: 400 })
  }

  const admin = await createSupabaseAdminClient()

  const { data: app, error } = await admin
    .from('request_applications')
    .insert({ user_id: user.id, last_name, first_name, nickname, email, phone, sns_url, location, notes, status: 'pending' })
    .select('id')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await admin.from('request_date_preferences').insert(
    preferences.map((p, i) => ({
      application_id: app.id,
      preference_order: i + 1,
      preferred_date: p.preferred_date,
      time_range: p.time_range,
      duration_hours: p.duration_hours,
    }))
  )

  await admin.from('request_application_models').insert(
    model_ids.map(model_id => ({ application_id: app.id, model_id, notified_at: new Date().toISOString() }))
  )

  await admin.from('request_applications').update({ status: 'notified' }).eq('id', app.id)

  // 選ばれたモデルへLINE通知
  const { data: models } = await admin
    .from('models')
    .select('id, name, line_id')
    .in('id', model_ids)
    .not('line_id', 'is', null)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://photofleur.vercel.app'
  for (const model of models || []) {
    await sendLineMessage(model.line_id, `【🔗リク撮依頼が入りました】\nHPから詳細を確認して参加可否を\n⚠️2日以内に回答してください。\n${siteUrl}/model-portal/request-applications`)
  }

  await notifyAdmin(admin, 'admin_request_applied').catch(() => {})

  return Response.json({ ok: true, id: app.id })
}
