import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role, roles').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return null
  return admin
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: privateBookings }, { data: goodsOrders }] = await Promise.all([
    admin.from('private_bookings')
      .select('id, last_name, first_name, email, payment_method, created_at, product_id, private_products(id, title, price, event_date, time_label, hanselling, hanselling_items)')
      .is('cancelled_at', null)
      .order('created_at', { ascending: false }),
    admin.from('goods_orders')
      .select('id, goods_id, last_name, first_name, email, payment_method, quantity, created_at, goods(id, title, price, hanselling)')
      .is('cancelled_at', null)
      .order('created_at', { ascending: false }),
  ])

  return Response.json({
    privateBookings: (privateBookings || []).map(b => ({ ...b, product: b.private_products || {} })),
    goodsOrders: (goodsOrders || []).map(o => ({ ...o, goods: o.goods || {} })),
  })
}
