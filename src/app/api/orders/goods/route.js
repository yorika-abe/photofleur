import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

export async function POST(req) {
  const body = await req.json()
  const { goods_id, last_name, first_name, email, phone, payment_method, quantity, notes, square_payment_id, options_selected } = body

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

  const { error } = await admin.from('goods_orders').insert({
    goods_id: goods.id,
    last_name,
    first_name: first_name || null,
    email,
    phone: phone || null,
    payment_method,
    quantity: qty,
    notes: notes || null,
    square_payment_id: square_payment_id || null,
    options_selected: options_selected || null,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (goods.stock >= 0) {
    await admin.from('goods').update({ stock: goods.stock - qty }).eq('id', goods.id)
  }

  // 選択肢ごとの在庫デクリメント
  if (options_selected && goods.options?.type === 'groups') {
    const groups = goods.options.groups || []
    let changed = false
    const updatedGroups = groups.map(g => {
      const selectedVal = options_selected[g.name]
      if (!selectedVal) return g
      const selected = Array.isArray(selectedVal) ? selectedVal : [selectedVal]
      const updatedChoices = (g.choices || []).map(c => {
        const cName = typeof c === 'string' ? c : c.name
        if (selected.includes(cName) && typeof c !== 'string' && c.stock > 0) {
          changed = true
          return { ...c, stock: c.stock - 1 }
        }
        return c
      })
      return { ...g, choices: updatedChoices }
    })
    if (changed) {
      await admin.from('goods').update({ options: { ...goods.options, groups: updatedGroups } }).eq('id', goods.id)
    }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const customerName = `${last_name}${first_name ? ` ${first_name}` : ''}`
    const total = goods.price * qty
    await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: email,
      subject: '【PhotoFleur】ご注文ありがとうございます',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;background:#f5f5f7;">
          <div style="background:#fff;border-radius:16px;padding:32px;">
            <h2 style="color:#1a3560;margin:0 0 20px;">ご注文ありがとうございます</h2>
            <p style="color:#333;margin:0 0 20px;">${customerName} 様<br>以下の内容でご注文を受け付けました。</p>
            <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px;">商品名</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">${goods.title}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;">数量</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${qty}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;">合計金額</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:700;">¥${total.toLocaleString()}</td></tr>
              <tr><td style="padding:10px 0;color:#888;">お支払方法</td><td style="padding:10px 0;">${payment_method === 'card' ? 'クレジットカード（決済済み）' : '当日現金'}</td></tr>
            </table>
            <p style="color:#555;font-size:14px;">担当よりご連絡いたします。</p>
            <p style="color:#aaa;font-size:12px;margin-top:24px;">PhotoFleur運営（送信専用）</p>
          </div>
        </div>
      `,
    })
  } catch {}

  return Response.json({ ok: true })
}
