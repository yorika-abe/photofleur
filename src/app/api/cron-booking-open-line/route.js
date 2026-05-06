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

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 現在時刻の1時間前〜現在の間にbooking_open_atがあるイベントを取得
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const { data: events } = await supabase
    .from('events')
    .select('id, title, subtitle, event_date, event_end_date, booking_open_at')
    .eq('status', 'active')
    .gte('booking_open_at', oneHourAgo.toISOString())
    .lte('booking_open_at', now.toISOString())

  if (!events || events.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: 'no booking open events' })
  }

  const { data: tmpl } = await supabase.from('line_templates').select('body').eq('key', 'camera_booking_open').single()
  const template = tmpl?.body ?? DEFAULTS.camera_booking_open

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'
  let sent = 0

  for (const ev of events) {
    const message = applyVars(template, {
      event_date: formatDateRange(ev.event_date, ev.event_end_date),
      title: ev.title || '',
      subtitle: ev.subtitle || '',
      event_url: `${siteUrl}/schedule/${ev.id}`,
    })
    const result = await broadcastCameraLine(message)
    if (result.ok) sent++
  }

  return Response.json({ ok: true, sent })
}
