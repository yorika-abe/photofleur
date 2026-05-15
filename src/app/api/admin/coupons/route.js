import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await admin.from('coupons').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ coupons: data || [] })
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (body.discount_type === 'fixed' && (body.discount_value === undefined || body.discount_value < 0)) {
    return Response.json({ error: '割引額は0以上を入力してください' }, { status: 400 })
  }
  if (body.discount_type === 'percentage' && (body.discount_value < 0 || body.discount_value > 100)) {
    return Response.json({ error: '割引率は0〜100で入力してください' }, { status: 400 })
  }
  const { data, error } = await admin.from('coupons').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ coupon: data })
}

export async function PATCH(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (updates.discount_type === 'fixed' && (updates.discount_value === undefined || updates.discount_value < 0)) {
    return Response.json({ error: '割引額は0以上を入力してください' }, { status: 400 })
  }
  if (updates.discount_type === 'percentage' && (updates.discount_value < 0 || updates.discount_value > 100)) {
    return Response.json({ error: '割引率は0〜100で入力してください' }, { status: 400 })
  }
  const { error } = await admin.from('coupons').update(updates).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await admin.from('coupons').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
