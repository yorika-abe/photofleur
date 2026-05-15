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

  const { data } = await admin
    .from('goods')
    .select('*')
    .order('created_at', { ascending: false })

  const goodsList = data || []
  const goodsIds = goodsList.map(g => g.id)
  const { data: orderRows } = goodsIds.length
    ? await admin.from('goods_orders').select('goods_id').in('goods_id', goodsIds).is('cancelled_at', null)
    : { data: [] }
  const orderCountMap = {}
  for (const row of orderRows || []) {
    orderCountMap[row.goods_id] = (orderCountMap[row.goods_id] || 0) + 1
  }
  const goods = goodsList.map(g => ({ ...g, order_count: orderCountMap[g.id] || 0 }))

  const { data: models } = await admin.from('models').select('id, name').order('name')
  return Response.json({ goods, models: models || [] })
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await admin
    .from('goods')
    .insert({
      title: body.title,
      description: body.description || null,
      price: body.price || 0,
      image: body.image || null,
      payment_method: body.payment_method || 'both',
      stock: body.stock !== undefined ? Number(body.stock) : -1,
      hanselling: body.hanselling || 0,
      options: body.options || null,
      sale_start: body.sale_start || null,
      sale_end: body.sale_end || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
