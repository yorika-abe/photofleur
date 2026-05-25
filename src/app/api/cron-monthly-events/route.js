import { createClient } from '@supabase/supabase-js'
import { broadcastCameraLine, sendLineGroupMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

function buildEventsList(items) {
  return items.map(e => `${e.day}日　${e.title}`).join('\n')
}

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('cron_secret')
  const secret = authHeader?.replace('Bearer ', '') || querySecret
  if (secret !== process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 22:00 UTC = 7:00 JST翌日。JSTで1日かどうかチェック
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  if (jst.getUTCDate() !== 1) {
    return Response.json({ ok: true, skipped: true, reason: 'not 1st of month' })
  }
  const month = jst.getUTCMonth() + 1

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: pausedRow } = await supabase.from('line_templates').select('body').eq('key', '_camera_broadcast_paused').maybeSingle()
  if (pausedRow?.body === 'true') {
    return Response.json({ ok: true, sent: false, reason: 'camera broadcast paused' })
  }

  const [{ data: events }, { data: models }] = await Promise.all([
    supabase.from('annual_events').select('*').eq('month', month).order('day'),
    supabase.from('models').select('name, birthday').eq('status', 'active').not('birthday', 'is', null),
  ])

  // モデルの誕生日（当月）
  const birthdays = (models || [])
    .filter(m => m.birthday && parseInt(m.birthday.split('-')[1]) === month)
    .map(m => ({ day: parseInt(m.birthday.split('-')[2]), title: `🎂 ${m.name}さんの誕生日` }))
    .sort((a, b) => a.day - b.day)

  // モデル全体用（誕生日＋notify_model_group=trueのイベント）
  const modelItems = [
    ...birthdays,
    ...(events || []).filter(e => e.notify_model_group).map(e => ({ day: e.day, title: e.title })),
  ].sort((a, b) => a.day - b.day)

  // 公式LINE用（誕生日＋notify_camera=trueのイベント）
  const cameraItems = [
    ...birthdays,
    ...(events || []).filter(e => e.notify_camera).map(e => ({ day: e.day, title: e.title })),
  ].sort((a, b) => a.day - b.day)

  const { data: templates } = await supabase.from('line_templates').select('key, body')
  const tmplMap = {}
  for (const t of (templates || [])) tmplMap[t.key] = t.body

  const results = {}

  if (modelItems.length > 0) {
    const template = tmplMap.monthly_events_model ?? DEFAULTS.monthly_events_model
    const message = applyVars(template, { month: String(month), events_list: buildEventsList(modelItems) })
    const r = await sendLineGroupMessage(message)
    results.model_group = r.ok
  }

  if (cameraItems.length > 0) {
    const template = tmplMap.monthly_events_camera ?? DEFAULTS.monthly_events_camera
    const message = applyVars(template, { month: String(month), events_list: buildEventsList(cameraItems) })
    const r = await broadcastCameraLine(message)
    results.camera = r.ok
  }

  return Response.json({ ok: true, month, results })
}
