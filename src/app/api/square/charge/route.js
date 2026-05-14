import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function applyCoupon(supabase, code, amount) {
  if (!code || amount <= 0) return amount
  const { data: coupon } = await supabase
    .from('coupons').select('discount_type, discount_value, is_active, valid_from, valid_until, max_uses, used_count')
    .eq('code', code.trim().toUpperCase()).eq('is_active', true).single()
  if (!coupon) return amount
  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return amount
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return amount
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return amount
  if (coupon.discount_type === 'fixed') return Math.max(0, amount - coupon.discount_value)
  return Math.max(0, Math.round(amount * (1 - coupon.discount_value / 100)))
}

async function slotPrice(supabase, slotId) {
  const { data: slot } = await supabase
    .from('booking_slots').select('price, max_reservations, event_entry_id').eq('id', slotId).single()
  if (!slot) return null
  const { count: indoorCount } = await supabase
    .from('bookings').select('*', { count: 'exact', head: true }).eq('slot_id', slotId).eq('is_outdoor', false)
  const isOutdoor = (indoorCount || 0) >= (slot.max_reservations || 1)
  if (!isOutdoor) return slot.price || 0
  const { data: entry } = await supabase.from('event_entries').select('event_id').eq('id', slot.event_entry_id).single()
  const { data: event } = await supabase.from('events').select('studio_fee').eq('id', entry?.event_id).single()
  return Math.max(0, (slot.price || 0) - (event?.studio_fee || 0))
}

export async function POST(req) {
  try {
    const { sourceId, email, context } = await req.json()
    if (!sourceId || !context?.type) {
      return Response.json({ error: '決済情報が不足しています' }, { status: 400 })
    }

    const supabase = db()
    let amount = 0

    if (context.type === 'slot') {
      const { slot_id, coupon_code } = context
      if (!slot_id) return Response.json({ error: 'スロット情報が不足しています' }, { status: 400 })
      const price = await slotPrice(supabase, slot_id)
      if (price === null) return Response.json({ error: '予約スロットが見つかりません' }, { status: 404 })
      amount = await applyCoupon(supabase, coupon_code, price)

    } else if (context.type === 'private') {
      const { token } = context
      if (!token) return Response.json({ error: 'トークンが不足しています' }, { status: 400 })
      const { data: product } = await supabase.from('private_products').select('price').eq('token', token).single()
      if (!product) return Response.json({ error: '商品が見つかりません' }, { status: 404 })
      amount = product.price || 0

    } else if (context.type === 'cart') {
      const { slot_items = [], product_items = [], goods_items = [], coupon_code } = context
      let total = 0
      for (const { slotId } of slot_items) {
        const price = await slotPrice(supabase, slotId)
        if (price !== null) total += price
      }
      for (const { productId } of product_items) {
        const { data: p } = await supabase.from('event_products').select('price').eq('id', productId).single()
        total += p?.price || 0
      }
      for (const { goodsId, quantity = 1 } of goods_items) {
        const { data: g } = await supabase.from('goods').select('price').eq('id', goodsId).single()
        total += (g?.price || 0) * quantity
      }
      amount = await applyCoupon(supabase, coupon_code, total)

    } else {
      return Response.json({ error: '不正なリクエストです' }, { status: 400 })
    }

    if (amount === 0) return Response.json({ success: true, payment_id: null })

    const res = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        amount_money: { amount, currency: 'JPY' },
        location_id: process.env.SQUARE_LOCATION_ID,
        ...(email ? { buyer_email_address: email } : {}),
      }),
    })

    const data = await res.json()
    if (!res.ok || data.errors) {
      const msg = data.errors?.[0]?.detail || 'カード決済に失敗しました'
      return Response.json({ error: msg }, { status: 400 })
    }

    return Response.json({ success: true, payment_id: data.payment.id })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
