import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()

  const [{ data: event }, { data: models }, { data: entries }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('models').select('id, name, image, studio_price, street_price').order('name'),
    supabase.from('event_entries').select('id, event_id, model_id').eq('event_id', id),
  ])

  if (!event) return Response.json({ error: 'Not found' }, { status: 404 })

  const entriesWithSlots = await Promise.all((entries || []).map(async (entry) => {
    const { data: slots } = await supabase
      .from('booking_slots')
      .select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations')
      .eq('event_entry_id', entry.id)
      .order('slot_order')
    return { ...entry, booking_slots: slots || [] }
  }))

  const { data: shifts } = event.event_date
    ? await supabase.from('model_shifts').select('model_id, available_slots, status').eq('event_date', event.event_date)
    : { data: [] }

  return Response.json({ event, models: models || [], entries: entriesWithSlots, shifts: shifts || [] })
}
