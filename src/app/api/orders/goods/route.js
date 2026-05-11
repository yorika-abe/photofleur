import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { renderEmailTemplate } from '@/lib/email-render'
import { decrementLayersStock, getLeafChoicePrice, buildSelectionsLabel } from '@/lib/product-layers'
import { sendLineCameraUser, sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

export async function POST(req) {
  const body = await req.json()
  const { goods_id, last_name, first_name, email, phone, payment_method, quantity, notes, square_payment_id, options_selected, layers_path, delivery_address, sns_url } = body

  if (!goods_id || !last_name || !email) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = await createSupabaseAdminClient()
  const { data: goods } = await admin
    .from('goods')
    .select('id, stock, payment_method, is_active, title, price, options')
    .eq('id', goods_id)
    .single()

  if (!goods || !goods.is_active) return Response.json({ error: 'Not found' }, { status: 404 })

  const qty = Math.max(1, Number(quantity) || 1)
  if (goods.stock >= 0 && goods.stock < qty) return Response.json({ error: 'Out of stock' }, { status: 409 })

  const layersLabel = layers_path?.length > 0 && goods.options?.type === 'layers'
    ? buildSelectionsLabel(goods.options, layers_path)
    : null
  const leafChoicePrice = layers_path?.length > 0 && goods.options?.type === 'layers'
    ? getLeafChoicePrice(goods.options, layers_path)
    : null
  const unitFinalPrice = leafChoicePrice ?? goods.price ?? 0
  const storedOptions = {
    ...(layersLabel ? { _label: layersLabel } : (options_selected || {})),
    _final_price: unitFinalPrice,
  }

  const insertBase = {
    goods_id: goods.id,
    last_name,
    first_name: first_name || null,
    email,
    phone: phone || null,
    payment_method,
    quantity: qty,
    notes: notes || null,
    square_payment_id: square_payment_id || null,
    options_selected: storedOptions,
    delivery_address: delivery_address || null,
  }
  let { error } = await admin.from('goods_orders').insert({ ...insertBase, sns_url: sns_url || null })
  if (error?.code === '42703') {
    const r = await admin.from('goods_orders').insert(insertBase)
    error = r.error
  }

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (goods.stock >= 0) {
    await admin.from('goods').update({ stock: goods.stock - qty }).eq('id', goods.id)
  }

  // 選択肢ごとの在庫デクリメント（layers形式）
  if (layers_path?.length > 0 && goods.options?.type === 'layers') {
    const updatedOptions = decrementLayersStock(goods.options, layers_path)
    if (updatedOptions !== goods.options) {
      await admin.from('goods').update({ options: updatedOptions }).eq('id', goods.id)
    }
  }

  // 選択肢ごとの在庫デクリメント（旧groups形式）
  if (options_selected && goods.options?.type === 'groups') {
    const groups = goods.options.groups || []
    let changed = false
    const updatedGroups = groups.map(g => {
      if (g.type === 'models' && g.model_choices) {
        // 新形式: model_choices
        const sel = options_selected[g.name] // {model_id, model_name, choice}
        if (!sel) return g
        const updatedModelChoices = g.model_choices.map(mc => {
          if (mc.model_id !== sel.model_id) return mc
          if (sel.choice && mc.choices?.length > 0) {
            const updatedChoices = mc.choices.map(c => {
              if (c.name === sel.choice && c.stock > 0) { changed = true; return { ...c, stock: c.stock - 1 } }
              return c
            })
            return { ...mc, choices: updatedChoices }
          } else if (mc.stock > 0) {
            changed = true
            return { ...mc, stock: mc.stock - 1 }
          }
          return mc
        })
        return { ...g, model_choices: updatedModelChoices }
      }
      // 手動選択肢（旧形式）
      const selectedVal = options_selected[g.name]
      if (!selectedVal) return g
      const selected = Array.isArray(selectedVal) ? selectedVal : [selectedVal]
      const updatedChoices = (g.choices || []).map(c => {
        const cName = typeof c === 'string' ? c : c.name
        if (selected.includes(cName) && typeof c !== 'string' && c.stock > 0) { changed = true; return { ...c, stock: c.stock - 1 } }
        return c
      })
      return { ...g, choices: updatedChoices }
    })
    if (changed) {
      await admin.from('goods').update({ options: { ...goods.options, groups: updatedGroups } }).eq('id', goods.id)
    }
  }

  // モデルへのLINE通知
  if (layers_path?.length > 0 && goods.options?.type === 'layers' && goods.options?.notify_model !== false) {
    try {
      const layers = goods.options.layers || []
      const selectedModelIds = []
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'models' && layers_path[i]) {
          const mc = (layers[i].model_choices || []).find(mc => mc.id === layers_path[i])
          if (mc?.model_id) selectedModelIds.push(mc.model_id)
        }
      }
      if (selectedModelIds.length > 0) {
        const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'event_product_booking_notify').single()
        const tmpl = tmplRow?.body ?? '{{product_name}} に新しい購入がありました\nニックネーム：{{nickname}}\nSNS：{{sns_url}}'
        const { data: modelList } = await admin.from('models').select('id, line_id').in('id', selectedModelIds)
        const customerName = `${last_name}${first_name ? ` ${first_name}` : ''}`
        const message = tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => ({
          product_name: goods.title, event_date: '', details: '', nickname: customerName, sns_url: sns_url || '',
        })[k] ?? '')
        for (const model of modelList || []) {
          if (!model.line_id) continue
          const result = await sendLineMessage(model.line_id, message).catch(() => ({ ok: false }))
          await admin.from('line_notifications').insert({
            model_id: model.id, type: 'booking', message, status: result.ok ? 'sent' : 'failed',
          }).catch(() => {})
        }
      }
    } catch {}
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const customerName = `${last_name}${first_name ? ` ${first_name}` : ''}`
    const choicePrice = layers_path?.length > 0 ? getLeafChoicePrice(goods.options, layers_path) : null
    const unitPrice = choicePrice ?? goods.price
    const total = unitPrice * qty
    const paymentLabel = payment_method === 'card' ? 'クレジットカード（決済済み）' : '当日現金'

    const templateResult = await renderEmailTemplate(admin, 'goods-order-confirmation', {
      customer_name: customerName,
      goods_title: goods.title,
      quantity: String(qty),
      total_price: `¥${total.toLocaleString()}`,
      payment_method: paymentLabel,
      delivery_address: delivery_address || '',
    }).catch(() => null)

    const html = templateResult?.html ?? `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;background:#f5f5f7;">
        <div style="background:#fff;border-radius:16px;padding:32px;">
          <h2 style="color:#1a3560;margin:0 0 20px;">ご注文ありがとうございます</h2>
          <p style="color:#333;margin:0 0 20px;">${customerName} 様<br>以下の内容でご注文を受け付けました。</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px;">商品名</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">${goods.title}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;">数量</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${qty}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;">合計金額</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:700;">¥${total.toLocaleString()}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;">お支払方法</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${paymentLabel}</td></tr>
            ${delivery_address ? `<tr><td style="padding:10px 0;color:#888;">お届け先</td><td style="padding:10px 0;white-space:pre-wrap;">${delivery_address}</td></tr>` : ''}
          </table>
          <p style="color:#555;font-size:14px;">担当よりご連絡いたします。</p>
          <p style="color:#aaa;font-size:12px;margin-top:24px;">PhotoFleur運営（送信専用）</p>
        </div>
      </div>
    `

    await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: email,
      subject: templateResult?.subject || '【PhotoFleur】ご注文ありがとうございます',
      html,
    })
  } catch {}

  // カメラマン個人LINE通知
  try {
    const server = await createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (user) {
      const { data: userProfile } = await admin.from('user_profiles').select('line_user_id').eq('id', user.id).single()
      if (userProfile?.line_user_id) {
        const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', 'photographer_goods').single()
        const template = tmplRow?.body ?? DEFAULTS.photographer_goods
        const customerName = `${last_name}${first_name ? ` ${first_name}` : ''}`
        const message = applyVars(template, { customer_name: customerName, goods_title: goods.title, quantity: String(qty) })
        await sendLineCameraUser(userProfile.line_user_id, message).catch(() => {})
      }
    }
  } catch {}

  return Response.json({ ok: true })
}
