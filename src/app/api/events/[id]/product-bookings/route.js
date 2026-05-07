import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { sendLineMessage, sendLineCameraUser } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'
import { randomUUID } from 'crypto'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

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
    let notifyModel = true
    try {
      const { data: prodData } = await admin.from('event_products').select('options').eq('id', product_id).single()
      if (prodData?.options?.notify_model === false) notifyModel = false
    } catch {}

    if (notifyModel) {
      const { data: modelList } = await admin.from('models').select('id, name, line_id').in('id', selected_model_ids)
      for (const model of modelList || []) {
        if (!model.line_id) continue
        const lines = ['【指定あり】']
        if (eventData?.event_date) lines.push(eventData.event_date + ' ' + product_name)
        else lines.push(product_name)
        const timeSlot = selections?.['時間帯'] || selections?.slot
        if (timeSlot) lines.push(timeSlot)
        const manualParts = Object.entries(selections || {})
          .filter(([k]) => !['model', 'モデル', '時間帯', 'slot', 'delivery_address'].includes(k))
          .map(([k, v]) => `${k}：${Array.isArray(v) ? v.join(', ') : v}`)
        if (manualParts.length > 0) lines.push(manualParts.join('\n'))
        lines.push(`ニックネーム：${customer_name}`)
        lines.push(`SNS URL：`)
        const message = lines.filter(Boolean).join('\n')
        const result = await sendLineMessage(model.line_id, message).catch(() => ({ ok: false }))
        await admin.from('line_notifications').insert({
          model_id: model.id, type: 'booking', message, status: result.ok ? 'sent' : 'failed',
        }).catch(() => {})
      }
    }
  }

  // カメラマン個人LINE通知
  try {
    const server = await createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (user) {
      const { data: userProfile } = await admin.from('user_profiles').select('line_user_id').eq('id', user.id).single()
      if (userProfile?.line_user_id) {
        const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'photographer_special').single()
        const template = tmplRow?.body ?? DEFAULTS.photographer_special
        const message = applyVars(template, {
          product_name: product_name || '',
          event_date: '',
          selections: Object.entries(selections || {}).map(([k, v]) => `${k}：${v}`).join('\n'),
        })
        await sendLineCameraUser(userProfile.line_user_id, message).catch(() => {})
      }
    }
  } catch {}

  return Response.json({ ok: true, qr_token: qrToken })
}
