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

  const goods = await Promise.all((data || []).map(async g => {
    const { count } = await admin
      .from('goods_orders')
      .select('*', { count: 'exact', head: true })
      .eq('goods_id', g.id)
      .is('cancelled_at', null)
    return { ...g, order_count: count || 0 }
  }))

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
