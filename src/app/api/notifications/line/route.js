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

const days = ['日', '月', '火', '水', '木', '金', '土']

function toJSTTimeStr(isoStr, offsetMinutes = 0) {
  const d = new Date(new Date(isoStr).getTime() - offsetMinutes * 60 * 1000)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

function buildDayBeforeMessage(event, entry) {
  const sortedSlots = [...(entry.booking_slots || [])].sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0))
  const reservedSlots = sortedSlots.filter(s => s.is_reserved)
  if (reservedSlots.length === 0) return null

  const d = new Date(event.event_date + 'T00:00:00')
  const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`

  let assemblyTimeStr = ''
  if (reservedSlots[0]?.start_time) {
    assemblyTimeStr = toJSTTimeStr(reservedSlots[0].start_time, event.model_assembly_offset_minutes ?? 30)
  }

  const photographerLines = sortedSlots.map(slot => {
    if (!slot.is_reserved) return `${slot.slot_label}　🈳`
    const bookings = Array.isArray(slot.bookings) ? slot.bookings : []
    const latest = bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    return `${slot.slot_label}　${latest?.sns_url || '（予約済み）'}`
  }).join('\n')

  let extraSections = ''
  if (event.model_extra_note) {
    const regex = /【([^】]+)】\s*\n?([\s\S]*?)(?=【|$)/g
    const sections = []
    let match
    while ((match = regex.exec(event.model_extra_note)) !== null) {
      if (match[2].trim()) sections.push(`【${match[1]}】\n${match[2].trim()}`)
    }
    extraSections = sections.join('\n\n')
  }

  let msg = `お疲れ様です😊\n次回撮影会の詳細です！ご確認よろしくお願いします✨\n\n`
  msg += `【📅集合日時】\n${dateStr}${assemblyTimeStr ? ' ' + assemblyTimeStr : ''}\n\n`
  if (event.location_name || event.meeting_address) {
    msg += `【📍集合場所】\n`
    if (event.location_name) msg += `場所：${event.location_name}\n`
    if (event.meeting_address) msg += `住所：${event.meeting_address}\n`
    if (event.meeting_map_url) msg += `Google MAP：${event.meeting_map_url}\n`
    msg += `（集合場所）\n\n`
  }
  msg += `【📸予約カメラマン】\n${photographerLines}\n\n`
  if (event.event_page_url) {
    msg += `【⏰スケジュール】\n🔍 HPよりご確認ください。\n${event.event_page_url}\n\n`
    msg += `🔸見方が分からない場合はご連絡ください💬\n🔸このラインにて集合時間は確定します。\n🔸集合時間以降のエントリー時間での予約は当日でも更新されます。\n\n`
  }
  if (event.model_lunch_note) msg += `【🍽ランチ】\n${event.model_lunch_note}\n\n`
  if (extraSections) msg += extraSections

  return msg.trim()
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
    const { event_id } = body
    let eventsQuery = supabase
      .from('events')
      .select(`
        id, event_date, location_name, meeting_address, meeting_map_url,
        event_page_url, model_lunch_note, model_extra_note, model_assembly_offset_minutes,
        event_entries(
          id,
          models(id, name, line_id),
          booking_slots(
            id, slot_label, slot_order, start_time, is_reserved,
            bookings(sns_url, created_at)
          )
        )
      `)

    if (event_id) {
      eventsQuery = eventsQuery.eq('id', event_id)
    } else {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      eventsQuery = eventsQuery.eq('event_date', tomorrow.toISOString().split('T')[0])
    }

    const { data: events } = await eventsQuery
    if (!events || events.length === 0) {
      return Response.json({ ok: true, sent: 0 })
    }

    let sentCount = 0
    for (const event of events) {
      for (const entry of event.event_entries || []) {
        const model = entry.models
        if (!model?.line_id) continue

        const message = buildDayBeforeMessage(event, entry)
        if (!message) continue

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
