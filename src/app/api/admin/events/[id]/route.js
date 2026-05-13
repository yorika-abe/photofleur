import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(_req, { params }) {
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

  const [shiftsResult, shiftRequestResult] = await Promise.all([
    event.event_date
      ? supabase.from('model_shifts').select('model_id, available_slots, available_from, available_until, status').eq('event_date', event.event_date)
      : { data: [] },
    event.event_date
      ? supabase.from('shift_request_dates').select('deadline').eq('request_date', event.event_date).maybeSingle()
      : { data: null },
  ])

  return Response.json({
    event,
    models: models || [],
    entries: entriesWithSlots,
    shifts: shiftsResult.data || [],
    shiftDeadline: shiftRequestResult.data?.deadline || null,
  })
}
