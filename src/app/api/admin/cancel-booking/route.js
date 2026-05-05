import { Resend } from 'resend'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { renderEmailTemplate } from '@/lib/email-render'

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

function buildCancelHtml({ customerName }) {
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

  const { booking_id, private_booking_id, event_product_booking_id, refund_amount } = await req.json()
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
    await admin.from('event_products').update({ stock: currentStock + 1 }).eq('id', epb.product_id).catch(() => {})

    // メール送信（失敗してもキャンセル自体は完了）
    if (epb.customer_email) {
      const customerName = epb.customer_name || '様'
      const templateResult = await renderEmailTemplate(admin, 'cancellation', { customer_name: customerName }).catch(() => null)
      await resend.emails.send({
        from: 'Photo Fleur運営 <onboarding@resend.dev>',
        to: epb.customer_email,
        subject: templateResult?.subject || '【PhotoFleur】ご予約キャンセルのお知らせ',
        html: templateResult?.html ?? buildCancelHtml({ customerName }),
      }).catch(() => {})
    }

    return Response.json({ ok: true, refund_ok, refund_error })
  }

  // 非公開商品予約のキャンセル
  if (private_booking_id) {
    const { data: pb } = await admin
      .from('private_bookings')
      .select('id, email, last_name, first_name, product_id, square_payment_id, private_products(title, price, stock)')
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
    await admin.from('private_products').update({ stock: currentStock + 1 }).eq('id', pb.product_id).catch(() => {})

    // メール送信（失敗してもキャンセル自体は完了）
    const customerName = `${pb.last_name || ''}${pb.first_name ? ` ${pb.first_name}` : ''}`.trim() || '様'
    const templateResult = await renderEmailTemplate(admin, 'cancellation', { customer_name: customerName }).catch(() => null)
    await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: pb.email,
      subject: templateResult?.subject || '【PhotoFleur】ご予約キャンセルのお知らせ',
      html: templateResult?.html ?? buildCancelHtml({ customerName }),
    }).catch(() => {})

    return Response.json({ ok: true, refund_ok, refund_error })
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
  const templateResult = await renderEmailTemplate(admin, 'cancellation', { customer_name: customerName }).catch(() => null)
  await resend.emails.send({
    from: 'Photo Fleur運営 <onboarding@resend.dev>',
    to: booking.email,
    subject: templateResult?.subject || '【PhotoFleur】ご予約キャンセルのお知らせ',
    html: templateResult?.html ?? buildCancelHtml({ customerName }),
  }).catch(() => {})

  return Response.json({ ok: true, refund_ok, refund_error })
  } catch (err) {
    console.error('cancel-booking error:', err)
    return Response.json({ error: 'サーバーエラー: ' + (err?.message || String(err)) }, { status: 500 })
  }
}
