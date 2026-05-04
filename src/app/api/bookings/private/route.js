import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage, sendLineGroupMessage } from '@/lib/line'

export async function POST(req) {
  const body = await req.json()
  const { token, last_name, first_name, email, phone, payment_method, notes } = body

  if (!token || !last_name || !email) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = await createSupabaseAdminClient()

  const { data: product } = await admin
    .from('private_products')
    .select('id, stock, payment_method, is_active, title, event_date, time_label, model_id, models(id, name, line_id)')
    .eq('token', token)
    .single()

  if (!product || !product.is_active) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }
  if (product.stock <= 0) {
    return Response.json({ error: 'Out of stock' }, { status: 409 })
  }

  // 支払方法チェック
  const allowed = product.payment_method
  if (allowed === 'cash' && payment_method !== 'cash') {
    return Response.json({ error: 'Invalid payment method' }, { status: 400 })
  }
  if (allowed === 'card' && payment_method !== 'card') {
    return Response.json({ error: 'Invalid payment method' }, { status: 400 })
  }

  const { error } = await admin.from('private_bookings').insert({
    product_id: product.id,
    last_name,
    first_name: first_name || null,
    email,
    phone: phone || null,
    payment_method,
    notes: notes || null,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 在庫を1減らす
  await admin
    .from('private_products')
    .update({ stock: product.stock - 1 })
    .eq('id', product.id)

  // モデルにLINE通知
  const model = product.models
  if (model) {
    const days = ['日', '月', '火', '水', '木', '金', '土']
    const dateStr = product.event_date
      ? (() => { const d = new Date(product.event_date + 'T00:00:00'); return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）` })()
      : '日程未定'
    const message = `【PhotoFleur】非公開商品の予約が入りました🌸

モデル名：${model.name}
商品名：${product.title}
日程：${dateStr}${product.time_label ? ` ${product.time_label}` : ''}
お客様名：${last_name}${first_name ? ` ${first_name}` : ''}

詳細は管理画面をご確認ください。`

    const result = model.line_id
      ? await sendLineMessage(model.line_id, message)
      : { ok: false, reason: 'no line_id' }

    await sendLineGroupMessage(message).catch(() => {})

    await admin.from('line_notifications').insert({
      model_id: model.id,
      type: 'booking',
      message,
      status: result.ok ? 'sent' : 'failed',
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}
