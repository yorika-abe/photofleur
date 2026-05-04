import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage } from '@/lib/line'

export async function POST(req, { params }) {
  const { id } = await params
  const admin = await createSupabaseAdminClient()
  const { product_id, product_name, customer_name, customer_email, selections, selected_model_ids } = await req.json()

  if (!customer_name?.trim()) return Response.json({ error: 'お名前を入力してください' }, { status: 400 })

  // Store booking (table: event_product_bookings)
  await admin.from('event_product_bookings').insert({
    event_id: id,
    product_id,
    customer_name,
    customer_email: customer_email || null,
    selections,
  }).catch(() => {})

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

  return Response.json({ ok: true })
}
