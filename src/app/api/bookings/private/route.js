import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { sendLineMessage, sendLineCameraUser } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'
import { randomUUID } from 'crypto'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

const days = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
}

export async function POST(req) {
  const body = await req.json()
  const {
    token, last_name, first_name, email, phone, nickname, sns_url,
    payment_method, notes, square_payment_id,
    event_date_input, meeting_place, shooting_time,
  } = body

  if (!token || !last_name || !email) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = await createSupabaseAdminClient()

  const { data: product } = await admin
    .from('private_products')
    .select('id, stock, payment_method, is_active, title, price, model_id, require_event_details, event_date, time_label, description, models(id, name, line_id, image)')
    .eq('token', token)
    .single()

  if (!product || !product.is_active) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }
  if (product.price < 0) {
    return Response.json({ error: '商品の価格が不正です' }, { status: 400 })
  }
  if (product.stock <= 0) {
    return Response.json({ error: 'Out of stock' }, { status: 409 })
  }

  // require_event_details のバリデーション
  if (product.require_event_details) {
    if (!event_date_input) return Response.json({ error: '開催日を入力してください' }, { status: 400 })
    if (!meeting_place) return Response.json({ error: '集合・解散場所を入力してください' }, { status: 400 })
    if (!shooting_time) return Response.json({ error: '撮影時間を入力してください' }, { status: 400 })
  }

  const allowed = product.payment_method
  if (allowed === 'cash' && payment_method !== 'cash') {
    return Response.json({ error: 'Invalid payment method' }, { status: 400 })
  }
  if (allowed === 'card' && payment_method !== 'card') {
    return Response.json({ error: 'Invalid payment method' }, { status: 400 })
  }

  const qrToken = randomUUID()
  const customerName = `${last_name}${first_name ? ` ${first_name}` : ''}`

  // productから日付・時間・場所を自動引き継ぎ（未入力の場合）
  const resolvedEventDate = event_date_input || product.event_date || null
  const resolvedShootingTime = shooting_time || product.time_label || null
  const resolvedMeetingPlace = meeting_place || (() => {
    if (!product.description) return null
    const m = product.description.match(/場所[:：]\s*(.+)/)
    return m ? m[1].trim() : null
  })()

  const { error } = await admin.from('private_bookings').insert({
    product_id: product.id,
    last_name,
    first_name: first_name || null,
    email,
    phone: phone || null,
    nickname: nickname || null,
    sns_url: sns_url || null,
    payment_method,
    notes: notes || null,
    event_date_input: resolvedEventDate,
    meeting_place: resolvedMeetingPlace,
    shooting_time: resolvedShootingTime,
    qr_token: qrToken,
    square_payment_id: square_payment_id || null,
    is_cancelled: false,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await admin.from('private_products').update({ stock: product.stock - 1 }).eq('id', product.id)

  // Optimistic concurrency check: verify stock did not go negative
  const { data: refreshed } = await admin.from('private_products').select('stock').eq('id', product.id).single()
  if (refreshed && refreshed.stock < 0) {
    await admin.from('private_products').update({ stock: 0 }).eq('id', product.id)
    await admin.from('private_bookings').delete().eq('qr_token', qrToken)
    return Response.json({ error: '申し込みが集中しています。もう一度お試しください。' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''

  fetch(`${baseUrl}/api/send-private-booking-mail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName, email, qr_token: qrToken,
      productTitle: product.title,
      price: product.price || 0,
      modelName: product.models?.name || null,
      modelImage: product.models?.image || null,
    }),
  }).catch(err => console.error('send-private-booking-mail error:', err))

  // モデルにLINE通知
  const model = product.models ?? null
  if (model?.line_id) {
    const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'private_booking_notify').single()
    const template = tmplRow?.body ?? DEFAULTS.private_booking_notify

    const message = applyVars(template, {
      event_date: formatDate(event_date_input),
      meeting_place: meeting_place || '',
      shooting_time: shooting_time || '',
      nickname: nickname || customerName,
      sns_url: sns_url || '',
    })

    const result = await sendLineMessage(model.line_id, message)
    await admin.from('line_notifications').insert({
      model_id: model.id,
      type: 'private_booking',
      message,
      status: result.ok ? 'sent' : 'failed',
    }).catch(err => console.error('Operation failed:', err))
  }

  // カメラマン個人LINE通知（LINE連携済みの場合）
  try {
    const server = await createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (user) {
      const { data: userProfile } = await admin.from('user_profiles').select('line_user_id').eq('id', user.id).single()
      if (userProfile?.line_user_id) {
        const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'photographer_private').single()
        const template = tmplRow?.body ?? DEFAULTS.photographer_private
        const message = applyVars(template, {
          product_title: product.title,
          model_name: product.models?.name || '',
        })
        await sendLineCameraUser(userProfile.line_user_id, message).catch(err => console.error('Operation failed:', err))
      }
    }
  } catch {}

  return Response.json({ ok: true, qr_token: qrToken })
}
