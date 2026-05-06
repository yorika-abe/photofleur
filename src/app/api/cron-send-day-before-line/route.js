import { createClient } from '@supabase/supabase-js'
import { sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

const days = ['日', '月', '火', '水', '木', '金', '土']

function toJSTTimeStr(isoStr, offsetMinutes = 0) {
  const d = new Date(new Date(isoStr).getTime() - offsetMinutes * 60 * 1000)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

function buildVars(event, entry) {
  const sortedSlots = [...(entry.booking_slots || [])].sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0))
  const reservedSlots = sortedSlots.filter(s => s.is_reserved)
  if (reservedSlots.length === 0) return null

  const d = new Date(event.event_date + 'T00:00:00')
  const event_date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`

  const assembly_time = reservedSlots[0]?.start_time
    ? toJSTTimeStr(reservedSlots[0].start_time, event.model_assembly_offset_minutes ?? 30)
    : ''

  // 集合場所: meeting_* が未入力なら公開の address にフォールバック
  const placeName = event.meeting_place || event.location_name || ''
  const streetAddress = event.meeting_address || event.address || ''
  const mapUrl = event.meeting_map_url || event.map_address || ''
  let location_info = ''
  if (placeName || streetAddress) {
    location_info += `【📍集合場所】\n`
    if (placeName) location_info += `場所：${placeName}\n`
    if (streetAddress) location_info += `住所：${streetAddress}\n`
    if (mapUrl) location_info += `Google MAP：${mapUrl}\n`
    location_info += `（集合場所）\n\n`
  }

  const photographer_slots = sortedSlots.map(slot => {
    if (!slot.is_reserved) return `${slot.slot_label}　🈳`
    const bookings = Array.isArray(slot.bookings) ? slot.bookings : []
    const latest = bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    return `${slot.slot_label}　${latest?.sns_url || '（予約済み）'}`
  }).join('\n')

  const event_page_url = event.event_page_url ?? ''

  const lunchText = event.model_lunch_note || '昼食代として　1000円支給もしくは撮影会にてご用意（飲食店の場合あり）します。'
  const model_lunch_note = `【🍽ランチ】\n${lunchText}\n\n`

  let extra_sections = ''
  if (event.model_extra_note) {
    const regex = /【([^】]+)】\s*\n?([\s\S]*?)(?=【|$)/g
    const sections = []
    let match
    while ((match = regex.exec(event.model_extra_note)) !== null) {
      if (match[2].trim()) sections.push(`【${match[1]}】\n${match[2].trim()}`)
    }
    extra_sections = sections.join('\n\n')
  }

  return { event_date, assembly_time, location_info, photographer_slots, event_page_url, model_lunch_note, extra_sections }
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

  const { data: tmplRow } = await supabase.from('line_templates').select('body').eq('key', 'model_day_before').single()
  const template = tmplRow?.body ?? DEFAULTS.model_day_before

  const { data: events } = await supabase
    .from('events')
    .select(`
      id, event_date, location_name, address, map_address,
      meeting_place, meeting_address, meeting_map_url,
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
    // イベント商品（モデル通知あり）の取得
    const { data: eventProducts } = await supabase
      .from('event_products')
      .select('id, name, options')
      .eq('event_id', event.id)

    const modelNotifyProducts = (eventProducts || []).filter(p => {
      if (p.options?.notify_model === false) return false
      if (p.options?.type === 'layers') return (p.options.layers || []).some(l => l.type === 'models')
      return (p.options?.groups || []).some(g => g.type === 'models' && (g.model_choices || []).length > 0)
    })

    let productBookings = []
    if (modelNotifyProducts.length > 0) {
      const { data: pBookings } = await supabase
        .from('event_product_bookings')
        .select('product_id, selections, sns_url, nickname')
        .in('product_id', modelNotifyProducts.map(p => p.id))
        .is('cancelled_at', null)
      productBookings = pBookings || []
    }

    for (const entry of event.event_entries || []) {
      const model = entry.models
      if (!model?.line_id) continue

      const vars = buildVars(event, entry)
      if (!vars) continue

      let message = applyVars(template, vars).trim()

      // 商品予約セクションを追加
      for (const product of modelNotifyProducts) {
        // モデルがこの商品に関係しているか確認（layers形式とgroups形式の両対応）
        let isModelRelated = false
        let modelName = null
        if (product.options?.type === 'layers') {
          const modelLayer = (product.options.layers || []).find(l => l.type === 'models')
          const mc = (modelLayer?.model_choices || []).find(mc => mc.model_id === model.id)
          if (mc) { isModelRelated = true; modelName = mc.model_name }
        } else {
          const modelGroup = (product.options?.groups || []).find(g => g.type === 'models')
          const mc = (modelGroup?.model_choices || []).find(mc => mc.model_id === model.id)
          if (mc) { isModelRelated = true; modelName = mc.model_name }
        }
        if (!isModelRelated) continue

        const pBookings = productBookings.filter(b => {
          if (b.product_id !== product.id) return false
          const sel = b.selections?.model || b.selections?.['モデル'] || []
          const modelArr = Array.isArray(sel) ? sel : [sel]
          return modelArr.some(m => m === modelName || m === model.id || m === model.name)
        })

        const lines = [`\n【👗${product.name}】`]
        if (pBookings.length === 0) {
          lines.push('（予約なし）')
        } else {
          for (const booking of pBookings) {
            const timeSlot = booking.selections?.['時間帯'] || booking.selections?.slot
            const extra = Object.entries(booking.selections || {})
              .filter(([k]) => !['model', 'モデル', '時間帯', 'slot', 'delivery_address'].includes(k))
              .map(([_, v]) => Array.isArray(v) ? v.join(' ') : String(v)).join(' ')
            const parts = [...(timeSlot ? [timeSlot] : []), booking.sns_url || '', extra].filter(Boolean)
            lines.push(parts.join(' ').trim() || '（予約あり）')
          }
        }

        message += lines.join('\n')
      }

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

  // 非公開予約の前日通知
  const { data: tmplPrivate } = await supabase.from('line_templates').select('body').eq('key', 'private_day_before').single()
  const privateTemplate = tmplPrivate?.body ?? DEFAULTS.private_day_before

  const { data: privateBookings } = await supabase
    .from('private_bookings')
    .select(`
      id, nickname, sns_url, event_date_input, meeting_place, shooting_time,
      private_products(model_id, models(id, name, line_id))
    `)
    .is('cancelled_at', null)
    .eq('event_date_input', tomorrowStr)

  for (const pb of privateBookings || []) {
    const model = pb.private_products?.models
    if (!model?.line_id) continue

    const d = new Date(pb.event_date_input + 'T00:00:00')
    const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`

    const message = applyVars(privateTemplate, {
      event_date: dateStr,
      meeting_place: pb.meeting_place || '',
      shooting_time: pb.shooting_time || '',
      nickname: pb.nickname || '',
      sns_url: pb.sns_url || '',
    }).trim()

    const result = await sendLineMessage(model.line_id, message)
    await supabase.from('line_notifications').insert({
      model_id: model.id,
      type: 'private_day_before',
      message,
      status: result.ok ? 'sent' : 'failed',
    }).catch(() => {})

    if (result.ok) sentCount++
  }

  return Response.json({ ok: true, sent: sentCount })
}
