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

function calcAssemblyTime(shoot_time) {
  if (!shoot_time) return '未定'
  const match = shoot_time.match(/(\d{1,2}):(\d{2})/)
  if (!match) return '未定'
  let h = parseInt(match[1])
  let m = parseInt(match[2]) - 15
  if (m < 0) { m += 60; h -= 1 }
  if (h < 0) h += 24
  return `${h}:${m.toString().padStart(2, '0')}`
}

function buildDayBeforeVars(r, modelsMap = {}, confirmedDate = null) {
  let date = '', location = '', shoot_time = '', model_names = '', photographer_info = ''
  if (r.type === 'custom') {
    if (confirmedDate && r.recruit_dates?.length > 0) {
      const found = r.recruit_dates.find(d => d.date === confirmedDate)
      date = fmtDate(confirmedDate)
      shoot_time = found ? found.time_range : r.shoot_time || '未定'
    } else {
      date = fmtDate(r.recruit_date)
      shoot_time = r.shoot_time || '未定'
    }
    location = r.location || '未定'
    model_names = (r.model_ids || []).map(id => modelsMap[id]?.name).filter(Boolean).join('、') || '未定'
    const parts = []
    if (r.photographer_name) parts.push(r.photographer_name)
    if (r.photographer_nickname) parts.push(r.photographer_nickname)
    if (r.photographer_sns) parts.push(r.photographer_sns)
    if (r.payment_status === '支払い済み') parts.push('✅ 支払い済み')
    else if (r.payment_status === '当日現金') parts.push('❌ 当日現金払い')
    else if (r.payment_status) parts.push('❓ 未定')
    photographer_info = parts.join('\n') || '未定'
  } else if (r.type === 'event') {
    const e = r.event || {}
    date = fmtDate(e.event_date)
    location = [e.title, e.subtitle, e.location].filter(Boolean).join(' ') || '未定'
    shoot_time = '未定'
    model_names = '（イベント詳細参照）'
    photographer_info = '（情報なし）'
  } else if (r.type === 'request') {
    const b = r.booking || {}
    date = fmtDate(b.event_date_input)
    location = b.meeting_place || '未定'
    shoot_time = b.shooting_time || '未定'
    model_names = b.private_products?.models?.name || '未定'
    const parts = []
    const name = [b.last_name, b.first_name].filter(Boolean).join(' ')
    if (name) parts.push(name)
    if (b.nickname) parts.push(`（${b.nickname}）`)
    if (b.sns_url) parts.push(b.sns_url)
    if (b.payment_method === 'card') parts.push('✅ カード決済済み')
    else if (b.payment_method === 'cash') parts.push('❌ 当日現金払い')
    photographer_info = parts.join('\n') || '未定'
  }
  return { date, location, assembly_time: calcAssemblyTime(shoot_time), shoot_time, model_names, photographer_info }
}

function getTomorrowJST() {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  jst.setUTCDate(jst.getUTCDate() + 1)
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`
}

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('cron_secret')
  const secret = authHeader?.replace('Bearer ', '') || querySecret
  if (secret !== process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })

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

  // recruit_dates（複数日程）のカスタム募集 — confirmed_date で明日かどうかはアプリ側で判定
  const { data: multiDateRecs } = await admin
    .from('staff_recruitments')
    .select('*')
    .eq('type', 'custom')
    .is('recruit_date', null)
    .not('recruit_dates', 'is', null)
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
    .select('*, private_bookings!inner(id, event_date_input, meeting_place, shooting_time, last_name, first_name, nickname, sns_url, payment_method, private_products(title, models(name)))')
    .eq('type', 'request')
    .eq('private_bookings.event_date_input', tomorrow)
    .eq('status', 'closed')

  const allRecs = [
    ...(customRecs || []),
    ...(multiDateRecs || []),
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

  // カスタム募集のモデル名を解決
  const allModelIds = [...new Set(allRecs.flatMap(r => r.model_ids || []))]
  let modelsMap = {}
  if (allModelIds.length > 0) {
    const { data: modelRows } = await admin.from('models').select('id, name').in('id', allModelIds)
    for (const m of modelRows || []) modelsMap[m.id] = m
  }

  const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'staff_day_before').maybeSingle()
  const tmpl = tmplRow?.body || DEFAULTS['staff_day_before']

  let sent = 0
  for (const r of allRecs) {
    const apps = appsMap[r.id] || []

    for (const app of apps) {
      if (r.recruit_dates?.length > 0 && app.confirmed_date !== tomorrow) continue
      const lineId = staffLineIds[app.user_id]
      if (!lineId) continue
      const vars = buildDayBeforeVars(r, modelsMap, app.confirmed_date || null)
      const msg = applyVars(tmpl, vars)
      const result = await sendLineMessage(lineId, msg)
      if (result.ok) sent++
    }
  }

  return Response.json({ ok: true, sent })
}
