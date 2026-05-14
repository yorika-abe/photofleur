import { requireAdmin } from '@/lib/auth'

export async function GET(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data } = await admin.from('event_products').select('*').eq('event_id', id).order('display_order').order('created_at')
  const products = await Promise.all((data || []).map(async p => {
    const { count } = await admin
      .from('event_product_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', p.id)
      .is('cancelled_at', null)
    return { ...p, booked_count: count || 0 }
  }))
  return Response.json(products)
}

export async function POST(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { data, error } = await admin.from('event_products').insert({
    event_id: id,
    name: body.name,
    image: body.image || null,
    description: body.description || null,
    price: parseInt(body.price) || 0,
    stock: parseInt(body.stock) || 1,
    display_order: parseInt(body.display_order) || 0,
    options: body.options ?? null,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { productId, ...updates } = await req.json()
  if (updates.price !== undefined) updates.price = parseInt(updates.price)
  if (updates.stock !== undefined) updates.stock = parseInt(updates.stock)
  await admin.from('event_products').update(updates).eq('id', productId).eq('event_id', id)
  return Response.json({ ok: true })
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { productId } = await req.json()
  await admin.from('event_products').delete().eq('id', productId).eq('event_id', id)
  return Response.json({ ok: true })
}
