import { createSupabaseAdminClient } from '@/lib/supabase-server'

const TIER_ORDER = { staff: 0, '12000': 1, '9900': 2, '8900': 3 }

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, event_type, title, location_name')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return Response.json({ events: [] })

  const eventIds = events.map(e => e.id)

  const { data: entries } = await supabase
    .from('event_entries')
    .select('id, event_id, models(id, name, price_tier, is_staff)')
    .in('event_id', eventIds)

  const entryIds = (entries || []).map(e => e.id)
  if (entryIds.length === 0) return Response.json({ events: events.map(e => ({ event: e, timeSlots: [], rows: [] })) })

  const { data: slots } = await supabase
    .from('booking_slots')
    .select('id, slot_label, slot_order, event_entry_id')
    .in('event_entry_id', entryIds)
    .neq('slot_order', 0)
    .order('slot_order', { ascending: true })

  const slotIds = (slots || []).map(s => s.id)

  const { data: bookings } = slotIds.length
    ? await supabase
        .from('bookings')
        .select('slot_id, last_name, first_name, payment_method')
        .in('slot_id', slotIds)
    : { data: [] }

  const bookingBySlot = {}
  for (const b of bookings || []) bookingBySlot[b.slot_id] = b

  const slotsByEntry = {}
  for (const s of slots || []) {
    if (!slotsByEntry[s.event_entry_id]) slotsByEntry[s.event_entry_id] = []
    slotsByEntry[s.event_entry_id].push({ ...s, booking: bookingBySlot[s.id] || null })
  }

  const entriesByEvent = {}
  for (const e of entries || []) {
    if (!entriesByEvent[e.event_id]) entriesByEvent[e.event_id] = []
    entriesByEvent[e.event_id].push(e)
  }

  const result = events.map(event => {
    const eventEntries = entriesByEvent[event.id] || []
    const allSlots = eventEntries.flatMap(e => slotsByEntry[e.id] || [])

    // Collect unique time slot labels sorted by slot_order
    const labelMinOrder = {}
    for (const s of allSlots) {
      if (labelMinOrder[s.slot_label] === undefined || s.slot_order < labelMinOrder[s.slot_label]) {
        labelMinOrder[s.slot_label] = s.slot_order
      }
    }
    const timeSlots = Object.keys(labelMinOrder).sort((a, b) => labelMinOrder[a] - labelMinOrder[b])

    // Sort models by tier order
    const sortedEntries = [...eventEntries]
      .filter(e => e.models)
      .sort((a, b) => (TIER_ORDER[a.models?.price_tier] ?? 99) - (TIER_ORDER[b.models?.price_tier] ?? 99))

    const rows = sortedEntries.map(e => {
      const cellByLabel = {}
      for (const s of slotsByEntry[e.id] || []) cellByLabel[s.slot_label] = s
      return {
        model: e.models,
        cells: Object.fromEntries(timeSlots.map(label => [label, cellByLabel[label] || null])),
      }
    })

    return { event, timeSlots, rows }
  })

  return Response.json({ events: result })
}
