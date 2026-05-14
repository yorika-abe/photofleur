import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const [{ data: events }, { data: models }] = await Promise.all([
    supabase.from('annual_events').select('*').order('month').order('day'),
    supabase.from('models').select('id, name, birthday, pending_data').order('birthday'),
  ])
  const normalizedModels = (models || [])
    .map(m => {
      const bd = m.birthday || m.pending_data?.birthday || null
      return { id: m.id, name: m.name, birthday: bd ? bd.replace(/\//g, '-') : null }
    })
    .filter(m => m.birthday)
  return Response.json({ events: events || [], models: normalizedModels })
}

export async function POST(req) {
  const supabase = await createSupabaseAdminClient()
  const { month, day, title, notify_model_group, notify_camera } = await req.json()
  const { data, error } = await supabase
    .from('annual_events')
    .insert({ month, day, title, notify_model_group, notify_camera })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}

export async function PUT(req) {
  const supabase = await createSupabaseAdminClient()
  const { id, ...updates } = await req.json()
  const { error } = await supabase.from('annual_events').update(updates).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req) {
  const supabase = await createSupabaseAdminClient()
  const { id } = await req.json()
  await supabase.from('annual_events').delete().eq('id', id)
  return Response.json({ ok: true })
}
