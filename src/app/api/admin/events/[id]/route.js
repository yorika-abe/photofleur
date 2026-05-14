import { requireAdmin } from '@/lib/auth'

export async function GET(_req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const [{ data: event }, { data: models }, { data: entries }] = await Promise.all([
    admin.from('events').select('*').eq('id', id).single(),
    admin.from('models').select('id, name, image, studio_price, street_price').order('name'),
    admin.from('event_entries').select('id, event_id, model_id').eq('event_id', id),
  ])

  if (!event) return Response.json({ error: 'Not found' }, { status: 404 })

  const entryIds = (entries || []).map(e => e.id)
  const { data: allSlots } = entryIds.length > 0
    ? await admin
        .from('booking_slots')
        .select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations, event_entry_id')
        .in('event_entry_id', entryIds)
        .order('slot_order')
    : { data: [] }

  const slotsByEntryId = {}
  for (const slot of (allSlots || [])) {
    if (!slotsByEntryId[slot.event_entry_id]) slotsByEntryId[slot.event_entry_id] = []
    slotsByEntryId[slot.event_entry_id].push(slot)
  }

  const entriesWithSlots = (entries || []).map(entry => ({
    ...entry,
    booking_slots: slotsByEntryId[entry.id] || [],
  }))

  const [shiftsResult, shiftRequestResult] = await Promise.all([
    event.event_date
      ? admin.from('model_shifts').select('model_id, available_slots, available_from, available_until, status').eq('event_date', event.event_date)
      : { data: [] },
    event.event_date
      ? admin.from('shift_request_dates').select('deadline').eq('request_date', event.event_date).maybeSingle()
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
