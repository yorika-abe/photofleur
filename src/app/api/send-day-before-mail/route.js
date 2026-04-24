import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { slot_id, email } = await req.json()
    if (!slot_id || !email) return Response.json({ error: 'slot_id, email は必須です' }, { status: 400 })

    const resend = new Resend(process.env.RESEND_API_KEY)

    const [{ data: slot }, { data: booking }] = await Promise.all([
      supabase.from('booking_slots').select('id, slot_label, price, event_entry_id').eq('id', slot_id).single(),
      supabase.from('bookings').select('name, qr_token, final_price, is_outdoor').eq('slot_id', slot_id).eq('email', email).order('created_at', { ascending: false }).limit(1).single(),
    ])

    if (!slot) return Response.json({ error: 'booking_slots の取得に失敗しました' }, { status: 500 })

    const { data: entry } = await supabase.from('event_entries').select('model_id, event_id').eq('id', slot.event_entry_id).single()
    if (!entry) return Response.json({ error: 'event_entries の取得に失敗しました' }, { status: 500 })

    const [{ data: model }, { data: event }] = await Promise.all([
      supabase.from('models').select('name, image').eq('id', entry.model_id).single(),
      supabase.from('events').select('*').eq('id', entry.event_id).single(),
    ])

    if (!event) return Response.json({ error: 'events の取得に失敗しました' }, { status: 500 })

    const customerName = booking?.name || 'お客様'
    const modelName = model?.name || ''
    const eventDate = formatDate(event.event_date)
    const slotLabel = slot.slot_label || ''
    const displayPrice = booking?.final_price ?? slot.price ?? 0
    const isOutdoor = booking?.is_outdoor || false

    const qrToken = booking?.qr_token
    const qrImageUrl = qrToken
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrToken)}`
      : null

    const isStreet = event.event_type === 'street'

    const locationBlock = isStreet
      ? `<div style="border:1px solid #ffe082; border-radius:14px; padding:20px; margin-bottom:20px; background:#fff8e1;">
          <p style="margin:0 0 10px; font-size:15px; font-weight:700; color:#e65100;">📍 集合場所</p>
          <p style="margin:0 0 8px; font-size:15px; line-height:1.8;">${event.meeting_place || event.location_name}</p>
          ${event.meeting_address ? `<p style="margin:0 0 8px; font-size:14px; color:#555; line-height:1.8;">${event.meeting_address}</p>` : ''}
          ${event.meeting_map_url ? `<a href="${event.meeting_map_url}" style="color:#2563eb; font-size:14px;">📍 Google Mapsで確認</a>` : ''}
        </div>`
      : `<div style="border:1px solid #e5e5e5; border-radius:14px; padding:20px; margin-bottom:20px; background:#fafafa;">
          <p style="margin:0 0 10px; font-size:15px; font-weight:700; color:#2f2244;">📍 集合場所・アクセス</p>
          <p style="margin:0 0 8px; font-size:15px; line-height:1.8;">${event.meeting_place || event.location_name}</p>
          ${event.meeting_address ? `<p style="margin:0 0 8px; font-size:14px; color:#555;">${event.meeting_address}</p>` : ''}
          ${event.meeting_map_url ? `<a href="${event.meeting_map_url}" style="color:#2563eb; font-size:14px;">📍 Google Mapsで確認</a>` : ''}
          ${event.access_note ? `<p style="margin:10px 0 0; font-size:13px; color:#666; line-height:1.8;">${event.access_note}</p>` : ''}
        </div>`

    const html = `
      <div style="margin:0; padding:0; background:#f5f5f7; font-family:Arial, sans-serif; color:#2f2244;">
        <div style="max-width:600px; margin:0 auto; padding:32px 16px;">
          <div style="background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#2f2244,#4a3570); padding:28px 32px; color:#fff;">
              <p style="margin:0 0 4px; font-size:12px; opacity:0.7; letter-spacing:0.1em;">REMINDER</p>
              <h1 style="margin:0; font-size:24px; font-weight:700;">明日の撮影会のご案内</h1>
            </div>

            <div style="padding:28px 32px;">
              <p style="font-size:15px; line-height:1.9; margin:0 0 24px;">
                ${customerName} 様<br>
                明日はご予約いただいている撮影日です。<br>
                以下の内容をご確認のうえ、当日お気をつけてお越しください。
              </p>

              <div style="background:#f8f5ff; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
                <p style="margin:0 0 8px; font-size:14px; line-height:2; color:#555;">
                  <strong style="color:#2f2244;">モデル</strong>　${modelName}<br>
                  <strong style="color:#2f2244;">開催日</strong>　${eventDate}<br>
                  <strong style="color:#2f2244;">予約枠</strong>　${slotLabel}<br>
                  <strong style="color:#2f2244;">料金</strong>　¥${Number(displayPrice).toLocaleString()}${isOutdoor ? '（屋外撮影）' : ''}
                </p>
              </div>

              ${locationBlock}

              ${qrImageUrl ? `
              <div style="text-align:center; margin-bottom:24px; padding:20px; border:1px solid #e0d5f5; border-radius:12px;">
                <p style="margin:0 0 12px; font-size:13px; color:#888;">受付時にこちらのQRコードをご提示ください</p>
                <img src="${qrImageUrl}" alt="受付QRコード" style="width:150px; height:150px; border-radius:8px;" />
              </div>
              ` : ''}

              ${event.baggage_storage ? `
              <div style="background:#e8f5e9; border-radius:10px; padding:12px 16px; margin-bottom:16px; font-size:13px; color:#388e3c;">
                🎒 荷物預かりをご利用いただけます
              </div>
              ` : ''}

              ${event.reminder_extra_note ? `
              <div style="background:#fff8e1; border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:13px; color:#795548; line-height:1.8; white-space:pre-line;">${event.reminder_extra_note}</div>
              ` : ''}

              <div style="font-size:13px; color:#777; line-height:2; border-top:1px solid #f0f0f0; padding-top:20px;">
                <p style="margin:0 0 8px;">ご不明点は公式LINEよりご連絡ください：<br>
                  <a href="https://lin.ee/7XLB4St" style="color:#2563eb;">https://lin.ee/7XLB4St</a>
                </p>
                <p style="margin:0;">モデルの体調不良等によりキャンセルとなる場合がございます。ご了承ください。</p>
              </div>

              <p style="margin:24px 0 0; font-size:13px; color:#aaa;">Photo Fleur運営</p>
            </div>
          </div>
        </div>
      </div>
    `

    const data = await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: email,
      subject: `【Photo Fleur】明日（${eventDate}）のご案内`,
      html,
    })

    return Response.json({ success: true, data })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
