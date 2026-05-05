import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendLineMessage } from '@/lib/line'
import { randomUUID } from 'crypto'

export async function POST(req) {
  try {
  const admin = await createSupabaseAdminClient()
  const { items, customer, paymentMethod, squarePaymentId, couponId } = await req.json()

  if (!items?.length) return Response.json({ error: 'カートが空です' }, { status: 400 })
  if (!customer?.email || !customer?.last_name || !customer?.first_name || !customer?.nickname) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const qrTokens = {}
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''
  const cartToken = randomUUID()
  const cartSlotItems = []
  const cartProductItems = []

  for (const item of items) {
    if (item.type === 'slot') {
      const { count: indoorCount } = await admin.from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', item.slotId).eq('is_outdoor', false)

      const { data: slot } = await admin.from('booking_slots')
        .select('max_reservations, price, event_entry_id').eq('id', item.slotId).single()

      const maxIndoor = slot?.max_reservations || 1
      const isOutdoor = (indoorCount || 0) >= maxIndoor

      // スタジオ料金取得（野外割引用）
      let studioFee = 0
      if (isOutdoor && slot?.event_entry_id) {
        const { data: entry } = await admin.from('event_entries').select('event_id').eq('id', slot.event_entry_id).single()
        if (entry) {
          const { data: event } = await admin.from('events').select('studio_fee').eq('id', entry.event_id).single()
          studioFee = event?.studio_fee || 0
        }
      }
      const finalPrice = isOutdoor ? Math.max(0, (item.price || 0) - studioFee) : (item.price || 0)

      const qrToken = randomUUID()
      const { data: booking, error } = await admin.from('bookings').insert({
        slot_id: item.slotId,
        name: customer.name,
        last_name: customer.last_name,
        first_name: customer.first_name,
        last_name_kana: customer.last_name_kana || '',
        first_name_kana: customer.first_name_kana || '',
        email: customer.email,
        phone: customer.phone || null,
        sns_url: customer.sns_url || null,
        nickname: customer.nickname || null,
        is_outdoor: isOutdoor,
        discount_amount: (item.price || 0) - finalPrice,
        final_price: finalPrice,
        coupon_id: couponId || null,
        marketing_consent: customer.marketing_consent || false,
        payment_method: paymentMethod || null,
        square_payment_id: squarePaymentId || null,
        qr_token: qrToken,
        cart_token: cartToken,
      }).select('id').single()

      if (!error && booking) {
        qrTokens[item.cartId] = qrToken
        cartSlotItems.push({ slot_id: item.slotId, final_price: finalPrice, is_outdoor: isOutdoor })

        // 屋内カウント更新
        const { count: newCount } = await admin.from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('slot_id', item.slotId).eq('is_outdoor', false)
        if ((newCount || 0) >= maxIndoor) {
          await admin.from('booking_slots').update({ is_reserved: true }).eq('id', item.slotId).catch(() => {})
        }

        // LINE通知
        fetch(`${baseUrl}/api/notifications/line`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'booking', slot_id: item.slotId }),
        }).catch(() => {})
      }

    } else if (item.type === 'product') {
      const productQrToken = randomUUID()
      const { data: productBooking } = await admin.from('event_product_bookings').insert({
        event_id: item.eventId,
        product_id: item.productId,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || null,
        sns_url: customer.sns_url || null,
        nickname: customer.nickname || null,
        payment_method: paymentMethod,
        square_payment_id: squarePaymentId || null,
        selections: { ...(item.selections || {}), ...(item.deliveryAddress ? { delivery_address: item.deliveryAddress } : {}) },
        qr_token: productQrToken,
        cart_token: cartToken,
      }).select('id').single().catch(() => ({ data: null }))

      if (productBooking) {
        qrTokens[item.cartId] = productQrToken

        let modelName = null
        if (item.selectedModelIds?.length > 0) {
          const { data: firstModel } = await admin.from('models').select('name').eq('id', item.selectedModelIds[0]).single().catch(() => ({ data: null }))
          modelName = firstModel?.name || null
        }
        cartProductItems.push({
          productTitle: item.name,
          eventDate: item.eventDate || null,
          timeLabel: item.selections?.slot || null,
          price: item.price || 0,
          modelName,
        })
      }

      // モデルへのLINE通知
      if (item.selectedModelIds?.length > 0) {
        const { data: modelList } = await admin.from('models')
          .select('id, name, line_id').in('id', item.selectedModelIds)
        for (const model of modelList || []) {
          if (!model.line_id) continue
          const slotText = item.selections?.slot ? `\n時間枠：${item.selections.slot}` : ''
          const message = `【PhotoFleur】予約商品のご予約🌸\n\n商品名：${item.name}${slotText}\nお名前：${customer.name}${customer.email ? `\nメール：${customer.email}` : ''}`
          const result = await sendLineMessage(model.line_id, message).catch(() => ({ ok: false }))
          await admin.from('line_notifications').insert({
            model_id: model.id, type: 'booking', message, status: result.ok ? 'sent' : 'failed',
          }).catch(() => {})
        }
      }
    }
  }

  // まとめて確認メール送信
  if (cartSlotItems.length > 0 || cartProductItems.length > 0) {
    fetch(`${baseUrl}/api/send-cart-confirmation-mail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customer.name,
        email: customer.email,
        cartToken,
        slotItems: cartSlotItems,
        productItems: cartProductItems,
      }),
    }).catch(() => {})
  }

  // クーポン使用数更新
  if (couponId) {
    await admin.rpc('increment_coupon_used', { coupon_id_arg: couponId }).catch(() => {})
  }

  // プロフィール更新
  fetch(`${baseUrl}/api/customer/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      last_name: customer.last_name, first_name: customer.first_name,
      last_name_kana: customer.last_name_kana, first_name_kana: customer.first_name_kana,
      phone: customer.phone, sns_url: customer.sns_url, nickname: customer.nickname,
    }),
  }).catch(() => {})

  return Response.json({ ok: true, qrTokens })
  } catch (err) {
    console.error('cart-checkout error:', err)
    return Response.json({ error: 'サーバーエラーが発生しました: ' + (err?.message || String(err)) }, { status: 500 })
  }
}
