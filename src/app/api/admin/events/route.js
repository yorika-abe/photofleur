import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Fetch entries separately to avoid schema cache join issues
  const { data: entries } = await supabase
    .from('event_entries')
    .select('id, event_id, model_id, models(name, image)')
    .in('event_id', (events || []).map(e => e.id))

  const entriesByEvent = {}
  for (const entry of (entries || [])) {
    if (!entriesByEvent[entry.event_id]) entriesByEvent[entry.event_id] = []
    entriesByEvent[entry.event_id].push(entry)
  }

  return Response.json((events || []).map(ev => ({
    ...ev,
    event_entries: entriesByEvent[ev.id] || [],
  })))
}

export async function POST(req) {
  const supabase = await createSupabaseAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('events').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(req) {
  const supabase = await createSupabaseAdminClient()
  const { id, ...updates } = await req.json()
  const { error } = await supabase.from('events').update(updates).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req) {
  const supabase = await createSupabaseAdminClient()
  const { id } = await req.json()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
