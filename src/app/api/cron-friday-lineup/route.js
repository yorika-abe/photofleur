import { createClient } from '@supabase/supabase-js'
import { broadcastCameraLine } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function formatDateRange(eventDate, eventEndDate) {
  if (!eventDate) return ''
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const d = new Date(eventDate + 'T00:00:00')
  const base = `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
  if (!eventEndDate || eventEndDate === eventDate) return base
  const ed = new Date(eventEndDate + 'T00:00:00')
  return `${base}〜${ed.getMonth() + 1}/${ed.getDate()}（${days[ed.getDay()]}）`
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

  // 22:00 UTC木曜 = 7:00 JST金曜。JSTで「明日（土）〜翌金曜」の範囲を取得
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const saturday = new Date(jst)
  saturday.setUTCDate(saturday.getUTCDate() + 1)
  const nextFriday = new Date(jst)
  nextFriday.setUTCDate(nextFriday.getUTCDate() + 7)
  const fromStr = saturday.toISOString().split('T')[0]
  const toStr = nextFriday.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, title, subtitle, event_date, event_end_date')
    .eq('status', 'active')
    .gte('event_date', fromStr)
    .lte('event_date', toStr)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return Response.json({ ok: true, sent: false, reason: 'no events this week' })
  }

  const eventsList = events.map(ev =>
    `${formatDateRange(ev.event_date, ev.event_end_date)}📍${ev.title || ''}\n${ev.subtitle || ''}`
  ).join('\n\n')

  const { data: tmpl } = await supabase.from('line_templates').select('body').eq('key', 'camera_friday_lineup').single()
  const template = tmpl?.body ?? DEFAULTS.camera_friday_lineup
  const message = template.replace('{{events_list}}', eventsList)

  const result = await broadcastCameraLine(message)
  return Response.json({ ok: true, sent: result.ok })
}
