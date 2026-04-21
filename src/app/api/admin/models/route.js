import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const [{ data: applications }, { data: models }] = await Promise.all([
    supabase.from('model_applications').select('*').order('created_at', { ascending: false }),
    supabase.from('models').select('*').order('name'),
  ])
  return Response.json({ applications: applications || [], models: models || [] })
}

export async function POST(req) {
  const supabase = await createSupabaseAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('models').insert({ ...body, status: body.status || 'active' }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(req) {
  const supabase = await createSupabaseAdminClient()
  const { table, id, ...updates } = await req.json()
  const { error } = await supabase.from(table).update(updates).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
