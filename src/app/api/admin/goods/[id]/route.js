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

export async function GET(_req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: goods } = await admin.from('goods').select('*').eq('id', id).single()
  if (!goods) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data: orders } = await admin
    .from('goods_orders')
    .select('*')
    .eq('goods_id', id)
    .order('created_at', { ascending: false })

  return Response.json({ ...goods, orders: orders || [] })
}

export async function PATCH(req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  if (body.image !== undefined) {
    const { data: old } = await admin.from('goods').select('image').eq('id', id).single()
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
    if (old?.image && old.image !== body.image && old.image.startsWith(base)) {
      await admin.storage.from('images').remove([old.image.replace(base, '')])
    }
  }

  const { data, error } = await admin
    .from('goods')
    .update({
      title: body.title,
      description: body.description,
      price: body.price,
      image: body.image,
      payment_method: body.payment_method,
      stock: body.stock,
      is_active: body.is_active,
      hanselling: body.hanselling ?? 0,
      options: body.options ?? null,
      sale_start: body.sale_start ?? null,
      sale_end: body.sale_end ?? null,
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
  const { data: goods } = await admin.from('goods').select('image').eq('id', id).single()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
  if (goods?.image?.startsWith(base)) {
    await admin.storage.from('images').remove([goods.image.replace(base, '')])
  }

  const { error } = await admin.from('goods').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
