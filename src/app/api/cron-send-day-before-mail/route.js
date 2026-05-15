import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { renderEmailTemplateWithBlocks } from '@/lib/email-render'
import { sendLineCameraUser } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

async function sendPhotographerDayBeforeLine(supabase, email, vars, templateKey, defaultKey) {
  try {
    const { data: cp } = await supabase.from('customer_profiles').select('user_id').eq('email', email).single()
    if (!cp?.user_id) return
    const { data: up } = await supabase.from('user_profiles').select('line_user_id').eq('id', cp.user_id).single()
    if (!up?.line_user_id) return
    const { data: tmplRow } = await supabase.from('line_templates').select('body').eq('key', templateKey).single()
    const template = tmplRow?.body ?? DEFAULTS[defaultKey]
    const message = applyVars(template, vars)
    await sendLineCameraUser(up.line_user_id, message).catch(() => {})
  } catch {}
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

function buildItemCard(item) {
  const price = item.price ?? item.final_price ?? 0
  const rows = []
  if (item.modelName) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>担当モデル：</strong>${item.modelName}</p>`)
  if (item.productTitle) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>商品名：</strong>${item.productTitle}</p>`)
  if (item.slotLabel) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>時間枠：</strong>${item.slotLabel}</p>`)
  else if (item.timeLabel) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>時間枠：</strong>${item.timeLabel}</p>`)
  if (item.meetingPlace) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>集合・解散場所：</strong>${item.meetingPlace}</p>`)
  if (item.staffName) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>受付スタッフ：</strong>${item.staffName}</p>`)
  rows.push(`<p style="margin:0; font-size:15px; line-height:1.8;"><strong>料金：</strong>¥${Number(price).toLocaleString()}${item.isOutdoor ? '（屋外撮影・割引適用済み）' : ''}</p>`)
  return `<div style="border:1px solid #e5e5e5; border-radius:14px; padding:18px; margin-bottom:16px; background:#fafafa;">${rows.join('')}</div>`
}

async function fetchStaffMap(supabase, type, idField, ids) {
  if (!ids.length) return {}
  const { data: recs } = await supabase.from('staff_recruitments').select(`id, ${idField}`).eq('type', type).in(idField, ids).eq('status', 'closed')
  if (!recs?.length) return {}
  const { data: apps } = await supabase.from('staff_recruitment_applications').select('recruitment_id, staff_name').in('recruitment_id', recs.map(r => r.id)).eq('status', 'confirmed')
  const recIdMap = Object.fromEntries(recs.map(r => [r.id, r[idField]]))
  const map = {}
  for (const app of apps || []) {
    const id = recIdMap[app.recruitment_id]
    if (id) { if (!map[id]) map[id] = []; map[id].push(app.staff_name) }
  }
  return map
}

function buildQrBlock(verifyUrl) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`
  return `
    <div style="text-align:center; margin:24px 0;">
      <p style="font-size:13px; color:#555; margin:0 0 10px;">当日受付時にこのQRコードをご提示ください</p>
      <img src="${qrImageUrl}" alt="受付QRコード" style="width:160px; height:160px; border:1px solid #e5e5e5; border-radius:10px;" />
    </div>
  `
}

export async function GET(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const authHeader = req.headers.get('authorization')
    const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('cron_secret')
    const secret = authHeader?.replace('Bearer ', '') || querySecret
    if (secret !== process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]
    const formattedDate = formatDate(tomorrowDate)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''

    // email -> { customerName, groups: { groupKey -> { verifyUrl, items } } }
    const emailMap = {}

    function addToGroup(email, customerName, groupKey, verifyUrl, item) {
      if (!emailMap[email]) emailMap[email] = { customerName, groups: {} }
      if (!emailMap[email].groups[groupKey]) emailMap[email].groups[groupKey] = { verifyUrl, items: [] }
      emailMap[email].groups[groupKey].items.push(item)
    }

    // --- 通常予約 ---
    const { data: events } = await supabase
      .from('events')
      .select('id, event_type, location_name, meeting_place, meeting_address, meeting_map_url')
      .eq('event_date', tomorrowDate)
      .eq('status', 'active')

    if (events?.length > 0) {
      const eventIds = events.map(e => e.id)
      const eventMap = Object.fromEntries(events.map(e => [e.id, e]))
      const eventStaffMap = await fetchStaffMap(supabase, 'event', 'event_id', eventIds)

      const { data: entries } = await supabase
        .from('event_entries').select('id, model_id, event_id').in('event_id', eventIds)

      if (entries?.length > 0) {
        const entryMap = Object.fromEntries(entries.map(e => [e.id, e]))
        const modelIds = [...new Set(entries.map(e => e.model_id).filter(Boolean))]
        const { data: models } = modelIds.length
          ? await supabase.from('models').select('id, name').in('id', modelIds)
          : { data: [] }
        const modelMap = Object.fromEntries((models || []).map(m => [m.id, m]))

        const { data: slots } = await supabase
          .from('booking_slots').select('id, slot_label, price, event_entry_id').in('event_entry_id', entries.map(e => e.id))

        if (slots?.length > 0) {
          const slotMap = Object.fromEntries(slots.map(s => [s.id, s]))
          const { data: bookings } = await supabase
            .from('bookings')
            .select('email, name, qr_token, cart_token, final_price, is_outdoor, slot_id')
            .in('slot_id', slots.map(s => s.id))
            .is('cancelled_at', null)

          for (const booking of bookings || []) {
            const slot = slotMap[booking.slot_id]
            const entry = slot ? entryMap[slot.event_entry_id] : null
            const event = entry ? eventMap[entry.event_id] : null
            const model = entry ? modelMap[entry.model_id] : null

            // cart_tokenがあればcart_tokenでQR、なければ個別qr_tokenでQR
            const groupKey = booking.cart_token ? `cart_${booking.cart_token}` : `solo_${booking.qr_token}`
            const verifyUrl = booking.cart_token
              ? `${baseUrl}/booking-verify?cart_token=${booking.cart_token}`
              : `${baseUrl}/booking-verify?token=${booking.qr_token}`

            addToGroup(booking.email, booking.name || 'お客様', groupKey, verifyUrl, {
              modelName: model?.name || '',
              slotLabel: slot?.slot_label || '',
              price: booking.final_price ?? slot?.price ?? 0,
              isOutdoor: booking.is_outdoor || false,
              staffName: eventStaffMap[entry?.event_id]?.join('・') || null,
              locationInfo: event ? {
                event_type: event.event_type,
                location_name: event.location_name,
                meeting_place: event.meeting_place,
                meeting_address: event.meeting_address,
                meeting_map_url: event.meeting_map_url,
              } : null,
            })
          }
        }
      }
    }

    // --- 非公開商品予約（個別qr_tokenのみ） ---
    const { data: privateBookings } = await supabase
      .from('private_bookings')
      .select('id, email, last_name, first_name, qr_token, event_date_input, shooting_time, meeting_place, private_products(title, price, event_date, time_label, models(name))')
      .is('cancelled_at', null)
      .not('private_products', 'is', null)

    const targetPrivate = (privateBookings || []).filter(b =>
      b.private_products?.event_date === tomorrowDate || b.event_date_input === tomorrowDate
    )
    const privateStaffMap = await fetchStaffMap(supabase, 'request', 'private_booking_id', targetPrivate.map(b => b.id))

    for (const b of targetPrivate) {
      const customerName = `${b.last_name}${b.first_name ? ` ${b.first_name}` : ''}`
      const product = b.private_products
      const groupKey = `solo_${b.qr_token}`
      const verifyUrl = `${baseUrl}/booking-verify?token=${b.qr_token}`
      addToGroup(b.email, customerName, groupKey, verifyUrl, {
        productTitle: product.title,
        timeLabel: product.time_label || b.shooting_time || null,
        price: product.price,
        modelName: product.models?.name || null,
        meetingPlace: b.meeting_place || null,
        staffName: privateStaffMap[b.id]?.join('・') || null,
      })
    }

    // --- 特別予約商品 ---
    const { data: epBookings } = await supabase
      .from('event_product_bookings')
      .select('id, customer_name, customer_email, qr_token, cart_token, selections, event_products(name, price), events(event_date)')
      .is('cancelled_at', null)
      .not('customer_email', 'is', null)

    const epEventIds = [...new Set((epBookings || []).filter(b => b.events?.event_date === tomorrowDate).map(b => b.event_id).filter(Boolean))]
    const epStaffMap = epEventIds.length ? await fetchStaffMap(supabase, 'event', 'event_id', epEventIds) : {}

    for (const b of (epBookings || []).filter(b => b.events?.event_date === tomorrowDate)) {
      const groupKey = b.cart_token ? `cart_${b.cart_token}` : `solo_${b.qr_token}`
      const verifyUrl = b.cart_token
        ? `${baseUrl}/booking-verify?cart_token=${b.cart_token}`
        : `${baseUrl}/booking-verify?token=${b.qr_token}`
      addToGroup(b.customer_email, b.customer_name, groupKey, verifyUrl, {
        productTitle: b.event_products?.name || '',
        timeLabel: b.selections?.slot || null,
        price: b.event_products?.price || 0,
        staffName: epStaffMap[b.event_id]?.join('・') || null,
      })
    }

    const emailEntries = Object.entries(emailMap)
    if (emailEntries.length === 0) {
      return Response.json({ success: true, message: '明日の送信対象はありません', sentCount: 0 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const results = []

    for (const [email, { customerName, groups }] of emailEntries) {
      try {
        // グループごとに「商品一覧＋QRコード」のブロックを生成
        let bodyHtml = ''
        for (const { verifyUrl, items } of Object.values(groups)) {
          const itemCards = items.map(buildItemCard).join('')

          // 場所情報（スロット予約のみ）
          let locationBlock = ''
          const loc = items.find(i => i.locationInfo)?.locationInfo
          if (loc) {
            const isStreet = loc.event_type === 'street'
            const place = isStreet ? (loc.meeting_place || loc.location_name || '') : (loc.location_name || '')
            if (place) {
              locationBlock = `
                <div style="border:1px solid #e5e5e5; border-radius:14px; padding:18px; margin-bottom:16px; background:#fafafa;">
                  <p style="margin:0 0 8px; font-size:15px;"><strong>${isStreet ? '集合場所' : '開催場所'}：</strong>${place}</p>
                  ${loc.meeting_address ? `<p style="margin:0; font-size:14px; color:#666;">${loc.meeting_address}</p>` : ''}
                </div>
              `
            }
          }

          bodyHtml += itemCards + locationBlock + buildQrBlock(verifyUrl)

          // 複数グループの場合は区切り線
          if (Object.keys(groups).length > 1) {
            bodyHtml += '<hr style="border:none; border-top:1px solid #e5e5e5; margin:24px 0;" />'
          }
        }

        // テンプレートがあればそちらを使用（宣材写真など含む）
        const tmplResult = await renderEmailTemplateWithBlocks(
          supabase, 'day-before-reminder',
          { items_block: bodyHtml },
          { customer_name: customerName, date: formattedDate }
        )

        let html
        if (tmplResult) {
          html = tmplResult.html
        } else {
          // テンプレート未保存時のフォールバック
          html = `
            <div style="margin:0; padding:0; background:#f5f5f7; font-family:Arial, sans-serif; color:#2f2244;">
              <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
                <div style="background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
                  <div style="padding:32px;">
                    <h1 style="margin:0 0 24px; font-size:24px; line-height:1.4; color:#2f2244;">明日の撮影会のご案内</h1>
                    <p style="margin:0 0 24px; font-size:16px; line-height:1.9; color:#333;">
                      ${customerName} 様<br><br>
                      明日はご予約いただいている撮影日です。<br>
                      以下の内容をご確認のうえ、当日お気をつけてお越しください。
                    </p>
                    ${bodyHtml}
                    <div style="font-size:14px; color:#555; line-height:2; border-top:1px solid #f0f0f0; padding-top:20px;">
                      <p style="margin:0;">ご不明点がございましたら、公式LINEよりご連絡ください。<br>
                        <a href="https://lin.ee/7XLB4St" style="color:#2563eb; text-decoration:underline;">https://lin.ee/7XLB4St</a>
                      </p>
                    </div>
                    <p style="margin:24px 0 0; font-size:13px; color:#aaa;">PhotoFleur運営（送信専用）</p>
                  </div>
                </div>
              </div>
            </div>
          `
        }

        const { error } = await resend.emails.send({
          from: 'Photo Fleur運営 <noreply@photofleur.jp>',
          to: email,
          subject: `【PhotoFleur】明日（${formattedDate}）のご案内`,
          html,
        })
        results.push({ email, groupCount: Object.keys(groups).length, ok: !error })

        // LINE通知（連携済みカメラマンへ）
        const allItems = Object.values(groups).flatMap(g => g.items)
        const staffNames = [...new Set(allItems.map(i => i.staffName).filter(Boolean))]
        await sendPhotographerDayBeforeLine(supabase, email, {
          customer_name: customerName,
          event_date: formattedDate,
          slot_label: allItems.map(i => i.slotLabel || i.productTitle || '').filter(Boolean).join(' / '),
          model_name: allItems.map(i => i.modelName || '').filter(Boolean).join(' / '),
          location: allItems.map(i => i.locationInfo?.location_name || i.locationInfo?.meeting_place || i.meetingPlace || '').filter(Boolean).join(' '),
          staff_info: staffNames.length ? `受付スタッフ：${staffNames.join('・')}\n` : '',
        }, 'photographer_day_before', 'photographer_day_before')
      } catch (e) {
        results.push({ email, ok: false, error: String(e) })
      }
    }

    return Response.json({
      success: true,
      sentCount: results.filter(r => r.ok).length,
      totalCount: results.length,
      results,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
