import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage } from '@/lib/line'
import { randomUUID } from 'crypto'

export async function POST(req, { params }) {
  const { id } = await params
  const admin = await createSupabaseAdminClient()
  const { product_id, product_name, customer_name, customer_email, selections, selected_model_ids } = await req.json()

  if (!customer_name?.trim()) return Response.json({ error: 'お名前を入力してください' }, { status: 400 })

  const qrToken = randomUUID()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''

  const { data: productBooking } = await admin.from('event_product_bookings').insert({
    event_id: id,
    product_id,
    customer_name,
    customer_email: customer_email || null,
    selections,
    qr_token: qrToken,
  }).select('id').single().catch(() => ({ data: null }))

  if (productBooking) {
    // イベント情報取得して確認メール送信
    const { data: eventData } = await admin.from('events').select('event_date, location_name').eq('id', id).single().catch(() => ({ data: null }))
    const { data: productData } = await admin.from('event_products').select('name, price').eq('id', product_id).single().catch(() => ({ data: null }))

    let modelName = null, modelImage = null
    if (selected_model_ids?.length > 0) {
      const { data: firstModel } = await admin.from('models').select('name, image').eq('id', selected_model_ids[0]).single().catch(() => ({ data: null }))
      modelName = firstModel?.name || null
      modelImage = firstModel?.image || null
    }

    if (customer_email) {
      fetch(`${baseUrl}/api/send-private-booking-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer_name,
          email: customer_email,
          qr_token: qrToken,
          productTitle: productData?.name || product_name,
          eventDate: eventData?.event_date || null,
          timeLabel: selections?.slot || null,
          price: productData?.price || 0,
          modelName,
          modelImage,
        }),
      }).catch(() => {})
    }
  }

  // Send LINE to selected models
  if (selected_model_ids?.length > 0) {
    const { data: modelList } = await admin.from('models').select('id, name, line_id').in('id', selected_model_ids)
    for (const model of modelList || []) {
      if (!model.line_id) continue
      const slotText = selections?.slot ? `\n時間枠：${selections.slot}` : ''
      const message = `【PhotoFleur】予約商品のご予約🌸\n\n商品名：${product_name}${slotText}\nお名前：${customer_name}${customer_email ? `\nメール：${customer_email}` : ''}`
      const result = await sendLineMessage(model.line_id, message).catch(() => ({ ok: false }))
      await admin.from('line_notifications').insert({
        model_id: model.id, type: 'booking', message, status: result.ok ? 'sent' : 'failed',
      }).catch(() => {})
    }
  }

  return Response.json({ ok: true, qr_token: qrToken })
}
