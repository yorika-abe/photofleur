import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage } from '@/lib/line'
import { notifyAdmin } from '@/lib/notify-admin'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'ログインが必要です' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return Response.json({ error: 'IDが必要です' }, { status: 400 })

  const admin = await createSupabaseAdminClient()

  const { data: app } = await admin
    .from('request_applications')
    .select('id, user_id, status, location, nickname, last_name, first_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!app) return Response.json({ error: '申請が見つかりません' }, { status: 404 })
  if (app.status !== 'confirmed') return Response.json({ error: 'キャンセルできない状態です' }, { status: 400 })

  await admin.from('request_applications').update({ status: 'customer_cancelled' }).eq('id', id)

  const [{ data: appModels }, { data: prefs }] = await Promise.all([
    admin.from('request_application_models').select('model_id, models(name, line_id)').eq('application_id', id),
    admin.from('request_date_preferences').select('*').eq('application_id', id).order('preference_order').limit(1),
  ])

  const pref = prefs?.[0]
  const modelNames = (appModels || []).map(m => m.models?.name).filter(Boolean).join('・')
  const bookingDetails = [
    pref ? `📅 ${pref.preferred_date} ${pref.time_range}（${pref.duration_hours}h）` : '',
    `📍 ${app.location || '未定'}`,
    `👤 ${modelNames}`,
    `📸 ${app.last_name}${app.first_name}（${app.nickname}）`,
  ].filter(Boolean).join('\n')

  const { data: tmplRows } = await admin.from('line_templates').select('key, body').in('key', ['request_cancel_model', 'request_cancel_staff'])
  const tmplMap = Object.fromEntries((tmplRows || []).map(r => [r.key, r.body]))

  const modelMsg = (tmplMap.request_cancel_model || DEFAULTS.request_cancel_model).replace('{{booking_details}}', bookingDetails)
  const staffMsg = (tmplMap.request_cancel_staff || DEFAULTS.request_cancel_staff).replace('{{booking_details}}', bookingDetails)

  for (const m of (appModels || [])) {
    const lineId = m.models?.line_id
    if (lineId) await sendLineMessage(lineId, modelMsg).catch(() => {})
  }

  const { data: staffRec } = await admin
    .from('staff_recruitments')
    .select('id')
    .eq('request_application_id', id)
    .maybeSingle()

  if (staffRec) {
    const { data: confirmedStaff } = await admin
      .from('staff_recruitment_applications')
      .select('user_id')
      .eq('recruitment_id', staffRec.id)
      .eq('status', 'confirmed')
      .maybeSingle()

    if (confirmedStaff?.user_id) {
      const { data: lineIdsRow } = await admin.from('site_settings').select('value').eq('key', 'line_staff_ids').maybeSingle()
      let staffLineIds = {}
      try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch {}
      const staffLineId = staffLineIds[confirmedStaff.user_id]
      if (staffLineId) await sendLineMessage(staffLineId, staffMsg).catch(() => {})
    }
  }

  await notifyAdmin(admin, 'admin_request_cancelled').catch(() => {})

  return Response.json({ ok: true })
}
