import { createClient } from '@supabase/supabase-js'
import { sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

async function getTemplate(supabase, key) {
  const { data } = await supabase.from('line_templates').select('body').eq('key', key).single()
  return data?.body ?? DEFAULTS[key]
}

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const body = await request.json()
  const { type, slot_id } = body

  if (!type) {
    return Response.json({ error: 'type is required' }, { status: 400 })
  }

  if (type === 'booking' && slot_id) {
    // Send booking notification to model
    const { data: slot } = await supabase
      .from('booking_slots')
      .select(`
        slot_label,
        event_entries(
          models(id, name, line_id),
          events(event_date, location_name)
        )
      `)
      .eq('id', slot_id)
      .single()

    if (!slot?.event_entries) {
      return Response.json({ error: 'slot not found' }, { status: 404 })
    }

    const entry = slot.event_entries
    const model = entry.models
    const event = entry.events

    if (!model?.line_id) {
      return Response.json({ ok: false, reason: 'model has no LINE ID' })
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('name')
      .eq('slot_id', slot_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const days = ['日', '月', '火', '水', '木', '金', '土']
    const d = new Date(event.event_date)
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`

    const tmpl = await getTemplate(supabase, 'model_booking_notify')
    const message = applyVars(tmpl, {
      model_name: model.name,
      event_date: dateStr,
      slot_label: slot.slot_label,
      customer_name: booking?.name || '不明',
    })

    // モデル個人に送信（line_idがある場合）
    const result = model.line_id
      ? await sendLineMessage(model.line_id, message)
      : { ok: false, reason: 'no line_id' }


    await supabase.from('line_notifications').insert({
      model_id: model.id,
      type: 'booking',
      message,
      status: result.ok ? 'sent' : 'failed',
    }).catch(() => {})

    return Response.json({ ok: true })
  }

  if (type === 'day_before') {
    // Send day-before notifications to all models with tomorrow's events
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

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
      return Response.json({ ok: true, sent: 0 })
    }

    const days = ['日', '月', '火', '水', '木', '金', '土']
    let sentCount = 0

    for (const event of events) {
      const d = new Date(event.event_date)
      const dateStr = `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`

      for (const entry of event.event_entries || []) {
        const model = entry.models
        if (!model?.line_id) continue

        const reservedSlots = (entry.booking_slots || []).filter(s => s.is_reserved)
        if (reservedSlots.length === 0) continue

        const slotLabels = reservedSlots.map(s => s.slot_label).join('、')
        const tmplDay = await getTemplate(supabase, 'model_day_before')
        const message = applyVars(tmplDay, {
          event_date: dateStr,
          slot_label: slotLabels,
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

  return Response.json({ error: 'unknown type' }, { status: 400 })
}
