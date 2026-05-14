import { requireAdmin } from '@/lib/auth'

export async function GET(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data, error } = await admin
    .from('event_product_bookings')
    .select('*')
    .eq('event_id', id)
    .is('cancelled_at', null)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const productIds = [...new Set((data || []).map(b => b.product_id).filter(Boolean))]
  const { data: products } = productIds.length
    ? await admin.from('event_products').select('id, name, price').in('id', productIds)
    : { data: [] }
  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]))

  const bookings = (data || []).map(b => ({
    ...b,
    product: productMap[b.product_id] || {},
    final_price: b.selections?._final_price ?? productMap[b.product_id]?.price ?? 0,
  }))
  return Response.json({ bookings })
}
