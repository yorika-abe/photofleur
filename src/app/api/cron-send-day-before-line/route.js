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

  const { data: productTmplRow } = await supabase.from('line_templates').select('body').eq('key', 'event_product_day_before_section').single()
  const productSectionTemplate = productTmplRow?.body ?? DEFAULTS.event_product_day_before_section

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

  // イベントごとの確定スタッフを一括取得
  const eventIds = events.map(e => e.id)
  const { data: staffRecs } = await supabase.from('staff_recruitments').select('id, event_id').eq('type', 'event').in('event_id', eventIds).eq('status', 'closed')
  const eventStaffMap = {}
  if (staffRecs?.length) {
    const { data: staffApps } = await supabase.from('staff_recruitment_applications').select('recruitment_id, staff_name').in('recruitment_id', staffRecs.map(r => r.id)).eq('status', 'confirmed')
    const recEventMap = Object.fromEntries(staffRecs.map(r => [r.id, r.event_id]))
    for (const app of staffApps || []) {
      const eid = recEventMap[app.recruitment_id]
      if (eid) { if (!eventStaffMap[eid]) eventStaffMap[eid] = []; eventStaffMap[eid].push(app.staff_name) }
    }
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

      const staffNames = eventStaffMap[event.id] || []
      const staff_info = staffNames.length ? `【受付スタッフ】\n${staffNames.join('・')}\n\n` : ''
      let message = applyVars(template, { ...vars, staff_info }).trim()

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

        // スロット型かどうか判定
        const layers = product.options?.type === 'layers'
          ? (product.options.layers || [])
          : (product.options?.groups || [])
        const hasSlotLayer = layers.some(l => l.type === 'slots')

        let bookings_list
        if (hasSlotLayer) {
          // イベントの予約枠ごとに表示（❌ = 予約なし）
          bookings_list = sortedSlots.map(s => {
            const b = pBookings.find(b => {
              const t = b.selections?.['時間帯'] || b.selections?.slot
              return t === s.slot_label
            })
            if (!b) return `${s.slot_label}　❌`
            const lines = [`${s.slot_label}　${b.nickname || ''}`]
            if (b.sns_url) lines.push(`　　　${b.sns_url}`)
            return lines.join('\n')
          }).join('\n')
        } else if (pBookings.length === 0) {
          bookings_list = '（予約なし）'
        } else {
          // フラット表示（ニックネーム + SNS URL を羅列）
          bookings_list = pBookings.map(b => {
            const lines = [b.nickname || ''].filter(Boolean)
            if (b.sns_url) lines.push(b.sns_url)
            return lines.join('\n')
          }).join('\n')
        }

        message += applyVars(productSectionTemplate, { product_name: product.name, bookings_list })
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

  // 非公開予約の確定スタッフを一括取得
  const privateIds = (privateBookings || []).map(pb => pb.id)
  const privateStaffMap = {}
  if (privateIds.length) {
    const { data: pRecs } = await supabase.from('staff_recruitments').select('id, private_booking_id').eq('type', 'request').in('private_booking_id', privateIds).eq('status', 'closed')
    if (pRecs?.length) {
      const { data: pApps } = await supabase.from('staff_recruitment_applications').select('recruitment_id, staff_name').in('recruitment_id', pRecs.map(r => r.id)).eq('status', 'confirmed')
      const recMap = Object.fromEntries(pRecs.map(r => [r.id, r.private_booking_id]))
      for (const app of pApps || []) {
        const bid = recMap[app.recruitment_id]
        if (bid) { if (!privateStaffMap[bid]) privateStaffMap[bid] = []; privateStaffMap[bid].push(app.staff_name) }
      }
    }
  }

  for (const pb of privateBookings || []) {
    const model = pb.private_products?.models
    if (!model?.line_id) continue

    const d = new Date(pb.event_date_input + 'T00:00:00')
    const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
    const staffNames = privateStaffMap[pb.id] || []
    const staff_info = staffNames.length ? `受付スタッフ：${staffNames.join('・')}\n` : ''

    const message = applyVars(privateTemplate, {
      event_date: dateStr,
      meeting_place: pb.meeting_place || '',
      shooting_time: pb.shooting_time || '',
      staff_info,
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
