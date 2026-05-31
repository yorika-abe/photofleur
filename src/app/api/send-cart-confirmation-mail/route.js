import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { renderEmailTemplateWithBlocks } from '@/lib/email-render'

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

function buildItemRow(item) {
  const dateStr = formatDate(item.eventDate)
  const price = item.price ?? item.final_price ?? 0
  const rows = []
  if (item.modelName) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>担当モデル：</strong>${item.modelName}</p>`)
  if (item.productTitle) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>商品名：</strong>${item.productTitle}</p>`)
  if (item.slotLabel) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>時間枠：</strong>${item.slotLabel}</p>`)
  else if (item.timeLabel) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>時間枠：</strong>${item.timeLabel}</p>`)
  if (dateStr) rows.push(`<p style="margin:0 0 8px; font-size:15px; line-height:1.8;"><strong>開催日：</strong>${dateStr}</p>`)
  rows.push(`<p style="margin:0; font-size:15px; line-height:1.8;"><strong>料金：</strong>¥${Number(price).toLocaleString()}${item.isOutdoor ? '（屋外撮影・割引適用済み）' : ''}</p>`)
  return `<div style="border:1px solid #e5e5e5; border-radius:14px; padding:18px; margin-bottom:16px; background:#fafafa;">${rows.join('')}</div>`
}

export async function POST(req) {
  try {
    const { customerName, email, cartToken, slotItems = [], productItems = [] } = await req.json()
    if (!email || !customerName) return Response.json({ error: 'email and customerName required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''

    // スロット情報をDBから取得（表示用）
    const enrichedSlotItems = await Promise.all(slotItems.map(async (item) => {
      const { data: slot } = await supabase.from('booking_slots').select('slot_label, price, event_entry_id').eq('id', item.slot_id).single().catch(() => ({ data: null }))
      if (!slot) return null
      const { data: entry } = await supabase.from('event_entries').select('model_id, event_id').eq('id', slot.event_entry_id).single().catch(() => ({ data: null }))
      if (!entry) return null
      const [{ data: model }, { data: event }] = await Promise.all([
        supabase.from('models').select('name').eq('id', entry.model_id).single().catch(() => ({ data: null })),
        supabase.from('events').select('event_date').eq('id', entry.event_id).single().catch(() => ({ data: null })),
      ])
      return {
        modelName: model?.name || '',
        eventDate: event?.event_date || null,
        slotLabel: slot.slot_label || '',
        price: item.final_price ?? slot.price ?? 0,
        isOutdoor: item.is_outdoor || false,
      }
    }))

    const allItems = [
      ...enrichedSlotItems.filter(Boolean),
      ...productItems,
    ]
    if (allItems.length === 0) return Response.json({ ok: true, skipped: true })

    // カートトークンで1つのQRコード
    const verifyUrl = cartToken ? `${baseUrl}/booking-verify?cart_token=${cartToken}` : null
    const qrImageUrl = verifyUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`
      : null

    const itemRows = allItems.map(buildItemRow).join('')
    const qrBlock = qrImageUrl ? `
      <div style="text-align:center; margin:28px 0;">
        <p style="font-size:14px; color:#555; margin:0 0 12px;">当日受付時にこのQRコードをご提示ください</p>
        <img src="${qrImageUrl}" alt="受付QRコード" style="width:180px; height:180px; border:1px solid #e5e5e5; border-radius:12px;" />
        <p style="font-size:12px; color:#aaa; margin:8px 0 0;">全ての予約情報を含むQRコードです</p>
      </div>
    ` : ''
    const items_block = itemRows + qrBlock

    // テンプレートを使ってHTML生成（保存済みテンプレートがあればそちらを優先）
    const tmplResult = await renderEmailTemplateWithBlocks(
      supabase, 'booking-confirmation',
      { items_block },
      { customer_name: customerName }
    )

    let html, subject
    if (tmplResult) {
      html = tmplResult.html
      subject = tmplResult.subject || '【PhotoFleur】ご予約確定のお知らせ'
    } else {
      // テンプレート未保存時のフォールバック
      subject = '【PhotoFleur】ご予約確定のお知らせ'
      html = `
        <div style="margin:0; padding:0; background:#f5f5f7; font-family:Arial, sans-serif; color:#2f2244;">
          <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
            <div style="background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <div style="padding:32px;">
                <h1 style="margin:0 0 24px; font-size:26px; line-height:1.4; color:#2f2244;">ご予約ありがとうございます</h1>
                <p style="margin:0 0 24px; font-size:16px; line-height:1.9; color:#333;">
                  ${customerName} 様<br><br>
                  この度はPhotoFleurにお申し込みいただき、誠にありがとうございます。<br>
                  以下の内容でご予約を受け付けました。
                </p>
                ${items_block}
                <div style="font-size:14px; color:#555; line-height:2; border-top:1px solid #f0f0f0; padding-top:20px; margin-top:8px;">
                  <p style="margin:0 0 12px;">
                    ご不明点がございましたら、お問い合わせチャットよりご連絡ください。<br>
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

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Photo Fleur運営 <noreply@photofleur.jp>',
      to: email,
      subject,
      html,
    })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
