import { createClient } from '@supabase/supabase-js'
import { broadcastCameraLine } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

function formatDateRange(eventDate, eventEndDate) {
  if (!eventDate) return ''
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const d = new Date(eventDate + 'T00:00:00')
  const base = `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
  if (!eventEndDate || eventEndDate === eventDate) return base
  const ed = new Date(eventEndDate + 'T00:00:00')
  return `${base}〜${ed.getMonth() + 1}/${ed.getDate()}（${days[ed.getDay()]}）`
}

function toJSTTimeStr(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: pausedRow } = await supabase.from('line_templates').select('body').eq('key', '_camera_broadcast_paused').maybeSingle()
  if (pausedRow?.body === 'true') {
    return Response.json({ ok: true, sent: false, reason: 'camera broadcast paused' })
  }

  // 22:00 UTC = 7:00 JST翌日。JSTの「今日」のbooking_open_atを持つイベントを取得
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const todayJST = jst.toISOString().slice(0, 10)
  const [year, month, day] = todayJST.split('-').map(Number)
  // JST 00:00 〜 23:59:59 をUTCに変換
  const jstDayStartUTC = new Date(Date.UTC(year, month - 1, day, -9, 0, 0))
  const jstDayEndUTC = new Date(Date.UTC(year, month - 1, day, 15, 0, 0))

  const { data: events } = await supabase
    .from('events')
    .select('id, title, subtitle, event_date, event_end_date, booking_open_at')
    .eq('status', 'active')
    .gte('booking_open_at', jstDayStartUTC.toISOString())
    .lt('booking_open_at', jstDayEndUTC.toISOString())

  if (!events || events.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: 'no booking open events today' })
  }

  const { data: tmpl } = await supabase.from('line_templates').select('body').eq('key', 'camera_booking_open').single()
  const template = tmpl?.body ?? DEFAULTS.camera_booking_open

  let sent = 0

  for (const ev of events) {
    const message = applyVars(template, {
      event_date: formatDateRange(ev.event_date, ev.event_end_date),
      title: ev.title || '',
      subtitle: ev.subtitle || '',
      booking_open_time: toJSTTimeStr(ev.booking_open_at),
    })
    const result = await broadcastCameraLine(message)
    if (result.ok) sent++
  }

  return Response.json({ ok: true, sent })
}
