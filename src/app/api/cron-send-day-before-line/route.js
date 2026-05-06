import { createClient } from '@supabase/supabase-js'
import { sendLineMessage } from '@/lib/line'

const days = ['日', '月', '火', '水', '木', '金', '土']

function toJSTTimeStr(isoStr, offsetMinutes = 0) {
  const d = new Date(new Date(isoStr).getTime() - offsetMinutes * 60 * 1000)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

function buildMessage(event, entry) {
  const sortedSlots = [...(entry.booking_slots || [])].sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0))
  const reservedSlots = sortedSlots.filter(s => s.is_reserved)
  if (reservedSlots.length === 0) return null

  const d = new Date(event.event_date + 'T00:00:00')
  const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`

  // 集合時間 = 最初の予約スロットのstart_time - オフセット
  const firstReserved = reservedSlots[0]
  let assemblyTimeStr = ''
  if (firstReserved?.start_time) {
    assemblyTimeStr = toJSTTimeStr(firstReserved.start_time, event.model_assembly_offset_minutes ?? 30)
  }

  // 予約カメラマン一覧（全スロット表示、予約済みならsns_url、空きなら🈳）
  const photographerLines = sortedSlots.map(slot => {
    if (!slot.is_reserved) return `${slot.slot_label}　🈳`
    const bookings = Array.isArray(slot.bookings) ? slot.bookings : []
    const latest = bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    return `${slot.slot_label}　${latest?.sns_url || '（予約済み）'}`
  }).join('\n')

  // 追加セクション（【タイトル】\n文章 形式）
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

  if (event.model_lunch_note) {
    msg += `【🍽ランチ】\n${event.model_lunch_note}\n\n`
  }

  if (extraSections) {
    msg += extraSections
  }

  return msg.trim()
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

  // 14:00 UTC = 23:00 JST
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const jstTomorrow = new Date(jst)
  jstTomorrow.setUTCDate(jstTomorrow.getUTCDate() + 1)
  const tomorrowStr = jstTomorrow.toISOString().split('T')[0]

  const { data: events } = await supabase
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
    .eq('event_date', tomorrowStr)

  if (!events || events.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: 'no events tomorrow' })
  }

  let sentCount = 0

  for (const event of events) {
    for (const entry of event.event_entries || []) {
      const model = entry.models
      if (!model?.line_id) continue

      const message = buildMessage(event, entry)
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
