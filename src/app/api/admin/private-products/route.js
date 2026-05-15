import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

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
    .from('private_products')
    .select('*, models(id, name, image)')
    .order('created_at', { ascending: false })

  const productIds = (data || []).map(p => p.id)
  const { data: bookingCounts } = productIds.length
    ? await admin.from('private_bookings').select('product_id').in('product_id', productIds)
    : { data: [] }
  const countMap = {}
  for (const row of bookingCounts || []) {
    countMap[row.product_id] = (countMap[row.product_id] || 0) + 1
  }
  const products = (data || []).map(p => ({ ...p, booking_count: countMap[p.id] || 0 }))

  const { data: models } = await admin
    .from('models')
    .select('id, name, image')
    .order('name')

  return Response.json({ products, models: models || [] })
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { error, data } = await admin
    .from('private_products')
    .insert({
      token: randomUUID(),
      title: body.title,
      description: body.description || null,
      price: body.price || 0,
      image: body.image || null,
      payment_method: body.payment_method || 'both',
      model_id: body.model_ids?.length > 0 ? body.model_ids[0] : (body.model_id || null),
      model_ids: body.model_ids?.length > 0 ? JSON.stringify(body.model_ids) : null,
      event_date: body.event_date || null,
      time_label: body.time_label || null,
      stock: body.stock ?? 1,
      hanselling: body.hanselling || 0,
      hanselling_items: body.hanselling_items || null,
      require_event_details: body.require_event_details ?? false,
      is_active: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
