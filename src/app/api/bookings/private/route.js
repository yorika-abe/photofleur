import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(req) {
  const body = await req.json()
  const { token, last_name, first_name, email, phone, payment_method, notes } = body

  if (!token || !last_name || !email) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = await createSupabaseAdminClient()

  const { data: product } = await admin
    .from('private_products')
    .select('id, stock, payment_method, is_active')
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

  return Response.json({ ok: true })
}
