import { Resend } from 'resend'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { renderEmailTemplate } from '@/lib/email-render'
import { sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

async function getTemplate(admin, key) {
  const { data } = await admin.from('line_templates').select('body').eq('key', key).maybeSingle()
  return data?.body ?? DEFAULTS[key] ?? ''
}

async function sendCancelLineToModelAndStaff(admin, { modelLineId, eventId, privateBookingId, bookingDetails, internal_reason }) {
  const modelTmpl = await getTemplate(admin, 'cancel_notify_model')
  const staffTmpl = await getTemplate(admin, 'cancel_notify_staff')
  const modelMsg = applyVars(modelTmpl, { booking_details: bookingDetails, cancel_reason: internal_reason })
  const staffMsg = applyVars(staffTmpl, { booking_details: bookingDetails, cancel_reason: internal_reason })

  if (modelLineId) {
    await sendLineMessage(modelLineId, modelMsg).catch(() => {})
  }

  const recQuery = eventId
    ? await admin.from('staff_recruitments').select('id').eq('type', 'event').eq('event_id', eventId).eq('status', 'closed')
    : privateBookingId
    ? await admin.from('staff_recruitments').select('id').eq('type', 'request').eq('private_booking_id', privateBookingId).eq('status', 'closed')
    : { data: [] }
  const recs = recQuery.data || []
  if (recs.length === 0) return

  const recIds = recs.map(r => r.id)
  const { data: apps } = await admin.from('staff_recruitment_applications').select('staff_name').in('recruitment_id', recIds).eq('status', 'confirmed')
  const { data: lineIdsRow } = await admin.from('site_settings').select('value').eq('key', 'line_staff_ids').maybeSingle()
  let staffLineIds = {}
  try { staffLineIds = JSON.parse(lineIdsRow?.value || '{}') } catch {}
  for (const app of apps || []) {
    const lineId = staffLineIds[app.staff_name]
    if (lineId) await sendLineMessage(lineId, staffMsg).catch(() => {})
  }
}

async function squareRefund(paymentId, amount) {
  try {
    const res = await fetch('https://connect.squareup.com/v2/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        idempotency_key: `refund-${paymentId}-${Date.now()}`,
        payment_id: paymentId,
        amount_money: { amount: amount * 100, currency: 'JPY' },
      }),
    })
    const data = await res.json()
    if (!res.ok || data.errors) return { ok: false, error: data.errors?.[0]?.detail || '返金処理に失敗しました' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function checkAdmin(admin) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return false
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin')
}

function buildCancelHtml({ customerName, cancelReason }) {
  const reasonBlock = cancelReason ? `
    <div style="background:#fce4ec; border-left:4px solid #c62828; border-radius:0 8px 8px 0; padding:14px 18px; margin:0 0 24px;">
      <p style="margin:0 0 6px; font-size:13px; font-weight:700; color:#c62828;">キャンセル理由</p>
      <p style="margin:0; font-size:14px; line-height:1.8; color:#555; white-space:pre-wrap;">${cancelReason}</p>
    </div>
  ` : ''

  return `
    <div style="margin:0; padding:0; background:#f5f5f7; font-family:Arial, sans-serif; color:#2f2244;">
      <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
        <div style="background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
          <div style="padding:32px;">

            <h1 style="margin:0 0 24px; font-size:26px; line-height:1.4; color:#2f2244;">ご予約がキャンセルされました</h1>

            <p style="margin:0 0 20px; font-size:16px; line-height:1.9; color:#333;">
              ${customerName} 様<br><br>
              この度はphotofleur撮影会をご予約いただき誠にありがとうございました。<br>
              本メールにてご予約はキャンセルとさせていただきます。
            </p>

            ${reasonBlock}

            <p style="margin:0 0 20px; font-size:15px; line-height:1.9; color:#444;">
              こちら都合でキャンセルとなり返金のある方はクレジットカード宛に返金させていただきますのでご確認ください。
            </p>

            <p style="margin:0 0 32px; font-size:15px; line-height:1.9; color:#444;">
              キャンセル料が発生する方に関しましては別途ご連絡させていただきます。
            </p>

            <hr style="border:none; border-top:1px solid #e5e5e5; margin:0 0 28px;" />

            <p style="margin:0 0 8px; font-size:14px; font-weight:700; color:#2f2244;">公式LINE追加のお願い</p>
            <p style="margin:0 0 16px; font-size:14px; line-height:1.8; color:#555;">
              公式LINEより最新の情報やクーポンを発信しております。<br>
              是非ご登録よろしくお願いいたします。
            </p>

            <p style="margin:0 0 6px; font-size:14px; line-height:2; color:#555;">
              公式LINE🔗 <a href="https://lin.ee/VgTzmhe" style="color:#06C755; text-decoration:underline;">https://lin.ee/VgTzmhe</a>
            </p>
            <p style="margin:0 0 6px; font-size:14px; line-height:2; color:#555;">
              公式Instagram🔗 <a href="https://www.instagram.com/photofleur.official" style="color:#E4405F; text-decoration:underline;">@photofleur.official</a>
            </p>
            <p style="margin:0 0 32px; font-size:14px; line-height:2; color:#555;">
              公式X🔗 <a href="https://x.com/photofleur_" style="color:#1DA1F2; text-decoration:underline;">@photofleur_</a>
            </p>

            <hr style="border:none; border-top:1px solid #e5e5e5; margin:0 0 28px;" />

            <p style="margin:0 0 28px; font-size:14px; line-height:2; color:#555;">
              PhotoFleur撮影会は<br>
              ここに集まる全ての人が一人の人間として、<br>
              モデル、カメラマン、クリエーターとして、<br>
              それぞれが自分らしい"花"となり、芽生え咲き、輝ける。<br>
              そんな場所を目指しています。
            </p>

            <hr style="border:none; border-top:1px solid #e5e5e5; margin:0 0 28px;" />

            <p style="margin:0 0 16px; font-size:13px; color:#888; line-height:1.8;">
              2025,09,13に元被写体モデルの女子大生によって始動した未完成な撮影会です。それでも皆様の拠り所となれるよう日々改善、成長してまいりますのでよろしくお願いいたします。
            </p>

            <p style="margin:24px 0 0; font-size:13px; color:#aaa;">PhotoFleur運営（送信専用）</p>
          </div>
        </div>
      </div>
    </div>
  `
}

export async function POST(req) {
  try {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { booking_id, private_booking_id, event_product_booking_id, goods_order_id, refund_amount, cancel_reason, internal_reason } = await req.json()
  const resend = new Resend(process.env.RESEND_API_KEY)

  // 特別予約商品のキャンセル
  if (event_product_booking_id) {
    const { data: epb } = await admin
      .from('event_product_bookings')
      .select('id, customer_email, customer_name, product_id, square_payment_id, event_products(name, price, stock)')
      .eq('id', event_product_booking_id)
      .single()

    if (!epb) return Response.json({ error: 'event product booking not found' }, { status: 404 })

    let refund_ok = false, refund_error = null
    if (refund_amount > 0 && epb.square_payment_id) {
      const r = await squareRefund(epb.square_payment_id, refund_amount)
      refund_ok = r.ok; refund_error = r.error || null
    }

    // DB更新を先に実行（メール失敗に関係なく）
    await admin.from('event_product_bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', event_product_booking_id)
    const currentStock = epb.event_products?.stock ?? 0
    try { await admin.from('event_products').update({ stock: currentStock + 1 }).eq('id', epb.product_id) } catch {}

    // メール送信（失敗してもキャンセル自体は完了）
    let mail_ok = false, mail_error = null
    if (epb.customer_email) {
      const customerName = epb.customer_name || '様'
      const templateResult = await renderEmailTemplate(admin, 'cancellation', { customer_name: customerName, cancel_reason: cancel_reason || '' }).catch(() => null)
      const { error: me } = await resend.emails.send({
        from: 'Photo Fleur運営 <onboarding@resend.dev>',
        to: epb.customer_email,
        subject: templateResult?.subject || '【PhotoFleur】ご予約キャンセルのお知らせ',
        html: templateResult?.html ?? buildCancelHtml({ customerName, cancelReason: cancel_reason }),
      }).catch(e => ({ error: e }))
      mail_ok = !me; mail_error = me ? String(me) : null
    }

    return Response.json({ ok: true, refund_ok, refund_error, mail_ok, mail_error })
  }

  // グッズ注文のキャンセル
  if (goods_order_id) {
    const { data: go } = await admin
      .from('goods_orders')
      .select('id, email, last_name, first_name, goods_id, quantity, square_payment_id, goods(title, price, stock)')
      .eq('id', goods_order_id)
      .single()

    if (!go) return Response.json({ error: 'goods order not found' }, { status: 404 })

    let refund_ok = false, refund_error = null
    if (refund_amount > 0 && go.square_payment_id) {
      const r = await squareRefund(go.square_payment_id, refund_amount)
      refund_ok = r.ok; refund_error = r.error || null
    }

    await admin.from('goods_orders').update({ cancelled_at: new Date().toISOString() }).eq('id', goods_order_id)
    if (go.goods_id && go.goods?.stock !== undefined) {
      try { await admin.from('goods').update({ stock: (go.goods.stock ?? 0) + (go.quantity || 1) }).eq('id', go.goods_id) } catch {}
    }

    const customerName = `${go.last_name || ''}${go.first_name ? ` ${go.first_name}` : ''}`.trim() || '様'
    let mail_ok = false, mail_error = null
    if (go.email) {
      const templateResult = await renderEmailTemplate(admin, 'cancellation', { customer_name: customerName, cancel_reason: cancel_reason || '' }).catch(() => null)
      const { error: me } = await resend.emails.send({
        from: 'Photo Fleur運営 <onboarding@resend.dev>',
        to: go.email,
        subject: templateResult?.subject || '【PhotoFleur】ご注文キャンセルのお知らせ',
        html: templateResult?.html ?? buildCancelHtml({ customerName, cancelReason: cancel_reason }),
      }).catch(e => ({ error: e }))
      mail_ok = !me; mail_error = me ? String(me) : null
    }

    return Response.json({ ok: true, refund_ok, refund_error, mail_ok, mail_error })
  }

  // 非公開商品予約のキャンセル
  if (private_booking_id) {
    const { data: pb } = await admin
      .from('private_bookings')
      .select('id, email, last_name, first_name, product_id, square_payment_id, event_date_input, private_products(title, price, stock, model_id, models(name, line_id))')
      .eq('id', private_booking_id)
      .single()

    if (!pb) return Response.json({ error: 'private booking not found' }, { status: 404 })

    let refund_ok = false, refund_error = null
    if (refund_amount > 0 && pb.square_payment_id) {
      const r = await squareRefund(pb.square_payment_id, refund_amount)
      refund_ok = r.ok; refund_error = r.error || null
    }

    // DB更新を先に実行（メール失敗に関係なく）
    await admin.from('private_bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', private_booking_id)
    const currentStock = pb.private_products?.stock ?? 0
    try { await admin.from('private_products').update({ stock: currentStock + 1 }).eq('id', pb.product_id) } catch {}

    // メール送信（失敗してもキャンセル自体は完了）
    const customerName = `${pb.last_name || ''}${pb.first_name ? ` ${pb.first_name}` : ''}`.trim() || '様'
    const templateResult = await renderEmailTemplate(admin, 'cancellation', { customer_name: customerName, cancel_reason: cancel_reason || '' }).catch(() => null)
    const { error: mail_err } = await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: pb.email,
      subject: templateResult?.subject || '【PhotoFleur】ご予約キャンセルのお知らせ',
      html: templateResult?.html ?? buildCancelHtml({ customerName, cancelReason: cancel_reason }),
    }).catch(e => ({ error: e }))

    // モデル・スタッフへのLINE通知
    if (internal_reason) {
      const pp = pb.private_products
      const bookingDetails = [
        `お客様：${customerName}`,
        pb.event_date_input ? `撮影日：${pb.event_date_input}` : null,
        pp?.title ? `商品：${pp.title}` : null,
        pp?.models?.name ? `担当モデル：${pp.models.name}` : null,
      ].filter(Boolean).join('\n')
      await sendCancelLineToModelAndStaff(admin, {
        modelLineId: pp?.models?.line_id || null,
        privateBookingId: private_booking_id,
        bookingDetails,
        internal_reason,
      }).catch(() => {})
    }

    return Response.json({ ok: true, refund_ok, refund_error, mail_ok: !mail_err, mail_error: mail_err ? String(mail_err) : null })
  }

  if (!booking_id) return Response.json({ error: 'booking_id required' }, { status: 400 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, email, name, last_name, first_name, slot_id, square_payment_id')
    .eq('id', booking_id)
    .single()

  if (!booking) return Response.json({ error: 'booking not found' }, { status: 404 })

  let refund_ok = false, refund_error = null
  if (refund_amount > 0 && booking.square_payment_id) {
    const r = await squareRefund(booking.square_payment_id, refund_amount)
    refund_ok = r.ok; refund_error = r.error || null
  }

  // DB更新を先に実行（メール失敗に関係なく）
  await admin.from('bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', booking_id)
  if (booking.slot_id) {
    await admin.from('booking_slots').update({ is_reserved: false }).eq('id', booking.slot_id)
  }

  // メール送信（失敗してもキャンセル自体は完了）
  const customerName = booking.name || `${booking.last_name || ''} ${booking.first_name || ''}`.trim() || '様'
  const templateResult = await renderEmailTemplate(admin, 'cancellation', { customer_name: customerName, cancel_reason: cancel_reason || '' }).catch(() => null)
  const { error: mail_err } = await resend.emails.send({
    from: 'Photo Fleur運営 <onboarding@resend.dev>',
    to: booking.email,
    subject: templateResult?.subject || '【PhotoFleur】ご予約キャンセルのお知らせ',
    html: templateResult?.html ?? buildCancelHtml({ customerName, cancelReason: cancel_reason }),
  }).catch(e => ({ error: e }))

  // モデル・スタッフへのLINE通知
  if (internal_reason && booking.slot_id) {
    try {
      const { data: slotData } = await admin.from('booking_slots').select('slot_label, event_entry_id').eq('id', booking.slot_id).single()
      if (slotData?.event_entry_id) {
        const { data: entry } = await admin.from('event_entries').select('event_id, model_id').eq('id', slotData.event_entry_id).single()
        const { data: eventData } = entry?.event_id ? await admin.from('events').select('event_date, title').eq('id', entry.event_id).single() : { data: null }
        const { data: modelData } = entry?.model_id ? await admin.from('models').select('name, line_id').eq('id', entry.model_id).single() : { data: null }
        const bookingDetails = [
          `お客様：${customerName}`,
          eventData?.event_date ? `撮影日：${eventData.event_date}` : null,
          eventData?.title ? `イベント：${eventData.title}` : null,
          slotData?.slot_label ? `時間枠：${slotData.slot_label}` : null,
          modelData?.name ? `担当モデル：${modelData.name}` : null,
        ].filter(Boolean).join('\n')
        await sendCancelLineToModelAndStaff(admin, {
          modelLineId: modelData?.line_id || null,
          eventId: entry?.event_id || null,
          bookingDetails,
          internal_reason,
        }).catch(() => {})
      }
    } catch {}
  }

  return Response.json({ ok: true, refund_ok, refund_error, mail_ok: !mail_err, mail_error: mail_err ? String(mail_err) : null })
  } catch (err) {
    console.error('cancel-booking error:', err)
    return Response.json({ error: 'サーバーエラー: ' + (err?.message || String(err)) }, { status: 500 })
  }
}
