import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'

async function getRole() {
  const serverClient = await createSupabaseServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = await createSupabaseAdminClient()
  const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  return data?.role || null
}

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const { data, error } = await supabase.from('fixed_costs').select('*').order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ costs: data })
}

export async function POST(req) {
  const role = await getRole()
  if (role !== 'owner') return Response.json({ error: '権限がありません' }, { status: 403 })
  const supabase = await createSupabaseAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('fixed_costs').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ cost: data })
}

export async function PATCH(req) {
  const role = await getRole()
  if (role !== 'owner') return Response.json({ error: '権限がありません' }, { status: 403 })
  const supabase = await createSupabaseAdminClient()
  const { id, ...body } = await req.json()
  const { data, error } = await supabase.from('fixed_costs').update(body).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ cost: data })
}

export async function DELETE(req) {
  const role = await getRole()
  if (role !== 'owner') return Response.json({ error: '権限がありません' }, { status: 403 })
  const supabase = await createSupabaseAdminClient()
  const { id } = await req.json()
  const { error } = await supabase.from('fixed_costs').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
