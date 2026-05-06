import { createClient } from '@supabase/supabase-js'
import { sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
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

  // 14:00 UTC = 23:00 JST。JSTで「明日」の日付を取得
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const jstTomorrow = new Date(jst)
  jstTomorrow.setUTCDate(jstTomorrow.getUTCDate() + 1)
  const tomorrowStr = jstTomorrow.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select(`
      id, event_date, location_name,
      event_entries(
        id,
        models(id, name, line_id),
        booking_slots(id, slot_label, is_reserved)
      )
    `)
    .eq('event_date', tomorrowStr)

  if (!events || events.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: 'no events tomorrow' })
  }

  const { data: tmpl } = await supabase.from('line_templates').select('body').eq('key', 'model_day_before').single()
  const template = tmpl?.body ?? DEFAULTS.model_day_before

  const days = ['日', '月', '火', '水', '木', '金', '土']
  let sentCount = 0

  for (const event of events) {
    const d = new Date(event.event_date + 'T00:00:00')
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`

    for (const entry of event.event_entries || []) {
      const model = entry.models
      if (!model?.line_id) continue

      const reservedSlots = (entry.booking_slots || []).filter(s => s.is_reserved)
      if (reservedSlots.length === 0) continue

      const message = applyVars(template, {
        event_date: dateStr,
        slot_label: reservedSlots.map(s => s.slot_label).join('、'),
        location_name: event.location_name ?? '',
      })

      const result = await sendLineMessage(model.line_id, message)
      await supabase.from('line_notifications').insert({
        model_id: model.id,
        type: 'day_before',
        message,
        status: result.ok ? 'sent' : 'failed',
      }).catch(() => {})

      if (result.ok) sentCount++
    }
  }

  return Response.json({ ok: true, sent: sentCount })
}
