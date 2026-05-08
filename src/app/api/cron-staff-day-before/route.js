import { createClient } from '@supabase/supabase-js'
import { sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

const DOW = ['日', '月', '火', '水', '木', '金', '土']
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}（${DOW[dt.getDay()]}）`
}

function buildDetailLine(r) {
  if (r.type === 'custom') {
    const typeLabel = r.shoot_type === 'request' ? 'リクエスト撮影' : '通常撮影会'
    return `📍${r.location || '未定'}　${r.shoot_time || '未定'}（${typeLabel}）`
  }
  if (r.type === 'event') {
    const e = r.event
    if (!e) return '（イベント情報なし）'
    const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://photofleur.vercel.app').replace(/\/$/, '')
    return `📍${e.title}${e.subtitle ? `　${e.subtitle}` : ''}　${e.location || ''}\nイベント詳細🔗${SITE_URL}/schedule/${e.id}`
  }
  if (r.type === 'request') {
    const b = r.booking
    if (!b) return '（予約情報なし）'
    const modelName = b.private_products?.models?.name || ''
    return `📍${b.meeting_place || '未定'}　${b.shooting_time || ''}${modelName ? `\n${modelName}` : ''}`
  }
  return ''
}

function getTomorrowJST() {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  jst.setUTCDate(jst.getUTCDate() + 1)
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`
}

export async function GET(req) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const tomorrow = getTomorrowJST()

  // 明日が recruit_date のカスタム募集（確定済みスタッフあり）
  const { data: customRecs } = await admin
    .from('staff_recruitments')
    .select('*')
    .eq('type', 'custom')
    .eq('recruit_date', tomorrow)
    .eq('status', 'closed')

  // 明日が event_date のイベント募集（確定済みスタッフあり）
  const { data: eventRecs } = await admin
    .from('staff_recruitments')
    .select('*, events!inner(id, title, subtitle, event_date, location)')
    .eq('type', 'event')
    .eq('events.event_date', tomorrow)
    .eq('status', 'closed')

  // 明日が event_date_input のリクエスト募集（確定済みスタッフあり）
  const { data: requestRecs } = await admin
    .from('staff_recruitments')
    .select('*, private_bookings!inner(id, event_date_input, meeting_place, shooting_time, private_products(title, models(name)))')
    .eq('type', 'request')
    .eq('private_bookings.event_date_input', tomorrow)
    .eq('status', 'closed')

  const allRecs = [
    ...(customRecs || []),
    ...(eventRecs || []).map(r => ({ ...r, event: r.events })),
    ...(requestRecs || []).map(r => ({ ...r, booking: r.private_bookings })),
  ]

  if (allRecs.length === 0) {
    return Response.json({ ok: true, sent: 0, message: 'no recruitments tomorrow' })
  }

  // 各募集の確定済みアプリケーション取得
  const recIds = allRecs.map(r => r.id)
  const { data: confirmedApps } = await admin
    .from('staff_recruitment_applications')
    .select('*')
    .in('recruitment_id', recIds)
    .eq('status', 'confirmed')

  // スタッフLINE ID設定取得
  const { data: lineIdsRow } = await admin
    .from('site_settings')
    .select('value')
    .eq('key', 'line_staff_ids')
    .maybeSingle()
  let staffLineIds = {}
  try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch {}

  const appsMap = {}
  for (const app of confirmedApps || []) {
    if (!appsMap[app.recruitment_id]) appsMap[app.recruitment_id] = []
    appsMap[app.recruitment_id].push(app)
  }

  let sent = 0
  for (const r of allRecs) {
    const apps = appsMap[r.id] || []
    const detail = buildDetailLine(r)

    for (const app of apps) {
      const lineId = staffLineIds[app.user_id]
      if (!lineId) continue

      const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'staff_day_before').maybeSingle()
      const tmpl = tmplRow?.body || DEFAULTS['staff_day_before']
      const msg = applyVars(tmpl, { details: detail })

      const result = await sendLineMessage(lineId, msg)
      if (result.ok) sent++
    }
  }

  return Response.json({ ok: true, sent })
}
