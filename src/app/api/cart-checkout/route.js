import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { sendLineMessage } from '@/lib/line'
import { randomUUID } from 'crypto'
import { decrementLayersStock } from '@/lib/product-layers'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

export async function POST(req) {
  try {
  const admin = await createSupabaseAdminClient()
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
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
      let productBooking = null
      const { data: epbResult, error: epbInsertError } = await admin.from('event_product_bookings').insert({
        event_id: item.eventId,
        product_id: item.productId,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || null,
        sns_url: customer.sns_url || null,
        nickname: customer.nickname || null,
        payment_method: paymentMethod || null,
        square_payment_id: squarePaymentId || null,
        selections: { ...(item.selections || {}), ...(item.deliveryAddress ? { delivery_address: item.deliveryAddress } : {}), _final_price: item.price ?? 0 },
        qr_token: productQrToken,
        cart_token: cartToken,
      }).select('id').single()
      if (epbInsertError) {
        console.error('[cart-checkout] event_product_bookings insert error:', epbInsertError)
      } else {
        productBooking = epbResult
      }

      if (productBooking) {
        qrTokens[item.cartId] = productQrToken

        // layers形式の在庫デクリメント
        if (item.layersPath?.length > 0) {
          try {
            const { data: prodOpts } = await admin.from('event_products').select('options').eq('id', item.productId).single()
            if (prodOpts?.options?.type === 'layers') {
              const updated = decrementLayersStock(prodOpts.options, item.layersPath)
              if (updated !== prodOpts.options) {
                await admin.from('event_products').update({ options: updated }).eq('id', item.productId)
              }
            }
          } catch {}
        }

        let modelName = null
        if (item.selectedModelIds?.length > 0) {
          let firstModel = null
          try { const { data } = await admin.from('models').select('name').eq('id', item.selectedModelIds[0]).single(); firstModel = data } catch {}
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
        let notifyModel = true
        try {
          const { data: prodData } = await admin.from('event_products').select('options').eq('id', item.productId).single()
          if (prodData?.options?.notify_model === false) notifyModel = false
        } catch {}

        if (notifyModel) {
          const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'event_product_booking_notify').single()
          const tmpl = tmplRow?.body ?? DEFAULTS.event_product_booking_notify

          const { data: modelList } = await admin.from('models')
            .select('id, name, line_id').in('id', item.selectedModelIds)
          for (const model of modelList || []) {
            if (!model.line_id) continue
            const timeSlot = item.selections?.['時間帯'] || item.selections?.slot
            const manualParts = Object.entries(item.selections || {})
              .filter(([k]) => !['model', 'モデル', '時間帯', 'slot', 'delivery_address'].includes(k))
              .map(([k, v]) => `${k}：${Array.isArray(v) ? v.join(', ') : v}`)
            const detailLines = [...(timeSlot ? [timeSlot] : []), ...manualParts]
            const details = detailLines.length > 0 ? detailLines.join('\n') + '\n' : ''
            const message = applyVars(tmpl, {
              event_date: item.eventDate || '',
              product_name: item.name || '',
              details,
              nickname: customer.nickname || '',
              sns_url: customer.sns_url || '',
            })
            const result = await sendLineMessage(model.line_id, message).catch(() => ({ ok: false }))
            await admin.from('line_notifications').insert({
              model_id: model.id, type: 'booking', message, status: result.ok ? 'sent' : 'failed',
            }).catch(() => {})
          }
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
  if (user) {
    try {
      await admin.from('customer_profiles').upsert({
        user_id: user.id,
        last_name: customer.last_name || null,
        first_name: customer.first_name || null,
        last_name_kana: customer.last_name_kana || null,
        first_name_kana: customer.first_name_kana || null,
        phone: customer.phone || null,
        sns_url: customer.sns_url || null,
        nickname: customer.nickname || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch {}
  }

  return Response.json({ ok: true, qrTokens })
  } catch (err) {
    console.error('cart-checkout error:', err)
    return Response.json({ error: 'サーバーエラーが発生しました: ' + (err?.message || String(err)) }, { status: 500 })
  }
}
