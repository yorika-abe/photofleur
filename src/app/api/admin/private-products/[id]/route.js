import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { deleteFromR2 } from '@/lib/r2'

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

export async function GET(_req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: product } = await admin
    .from('private_products')
    .select('*, models(id, name, image)')
    .eq('id', id)
    .single()

  if (!product) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data: bookings } = await admin
    .from('private_bookings')
    .select('id, last_name, first_name, email, phone, nickname, sns_url, payment_method, notes, event_date_input, meeting_place, shooting_time, cancelled_at, created_at')
    .eq('product_id', id)
    .order('created_at', { ascending: false })

  return Response.json({ ...product, bookings: bookings || [] })
}

export async function PATCH(req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  if (body.image !== undefined) {
    const { data: old } = await admin.from('private_products').select('image').eq('id', id).single()
    if (old?.image && old.image !== body.image) await deleteFromR2([old.image])
  }

  const { error, data } = await admin
    .from('private_products')
    .update({
      title: body.title,
      description: body.description,
      price: body.price,
      image: body.image,
      payment_method: body.payment_method,
      model_id: body.model_ids?.length > 0 ? body.model_ids[0] : (body.model_id || null),
      model_ids: body.model_ids?.length > 0 ? JSON.stringify(body.model_ids) : null,
      event_date: body.event_date || null,
      time_label: body.time_label || null,
      stock: body.stock,
      hanselling: body.hanselling,
      hanselling_items: body.hanselling_items,
      require_event_details: body.require_event_details,
      is_active: body.is_active,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: product } = await admin.from('private_products').select('image').eq('id', id).single()
  if (product?.image) await deleteFromR2([product.image])

  const { error } = await admin.from('private_products').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
