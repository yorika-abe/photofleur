import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const { data } = await supabase.from('event_products').select('*').eq('event_id', id).order('display_order').order('created_at')
  return Response.json(data || [])
}

export async function POST(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('event_products').insert({
    event_id: id,
    name: body.name,
    image: body.image || null,
    description: body.description || null,
    price: parseInt(body.price) || 0,
    stock: parseInt(body.stock) || 1,
    display_order: parseInt(body.display_order) || 0,
    available_slots: body.available_slots?.length ? body.available_slots : null,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const { productId, ...updates } = await req.json()
  if (updates.price !== undefined) updates.price = parseInt(updates.price)
  if (updates.stock !== undefined) updates.stock = parseInt(updates.stock)
  await supabase.from('event_products').update(updates).eq('id', productId).eq('event_id', id)
  return Response.json({ ok: true })
}

export async function DELETE(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const { productId } = await req.json()
  await supabase.from('event_products').delete().eq('id', productId).eq('event_id', id)
  return Response.json({ ok: true })
}
