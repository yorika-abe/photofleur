import { createSupabaseAdminClient } from '@/lib/supabase-server'

const TIER_ORDER = { staff: 0, '12000': 1, '9900': 2, '8900': 3 }

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 90)
  const since = pastDate.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, event_type, title, location_name, studio_budget')
    .gte('event_date', since)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return Response.json({ events: [] })

  const eventIds = events.map(e => e.id)

  const { data: entries } = await supabase
    .from('event_entries')
    .select('id, event_id, model_id')
    .in('event_id', eventIds)

  const entryIds = (entries || []).map(e => e.id)
  if (entryIds.length === 0) return Response.json({ events: events.map(e => ({ event: e, timeSlots: [], rows: [] })) })

  const modelIds = [...new Set((entries || []).map(e => e.model_id).filter(Boolean))]
  const { data: modelsData } = modelIds.length
    ? await supabase.from('models').select('id, name, price_tier, is_staff').in('id', modelIds)
    : { data: [] }
  const modelMap = Object.fromEntries((modelsData || []).map(m => [m.id, m]))

  const { data: slots } = await supabase
    .from('booking_slots')
    .select('id, slot_label, slot_order, event_entry_id, price')
    .in('event_entry_id', entryIds)
    .neq('slot_order', 0)
    .order('slot_order', { ascending: true })

  const slotIds = (slots || []).map(s => s.id)

  const { data: bookings } = slotIds.length
    ? await supabase
        .from('bookings')
        .select('slot_id, last_name, first_name, nickname, sns_url, payment_method, cancelled_at')
        .in('slot_id', slotIds)
        .is('cancelled_at', null)
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

    const labelMinOrder = {}
    for (const s of allSlots) {
      if (labelMinOrder[s.slot_label] === undefined || s.slot_order < labelMinOrder[s.slot_label]) {
        labelMinOrder[s.slot_label] = s.slot_order
      }
    }
    const timeSlots = Object.keys(labelMinOrder).sort((a, b) => labelMinOrder[a] - labelMinOrder[b])

    const sortedEntries = [...eventEntries]
      .filter(e => modelMap[e.model_id])
      .sort((a, b) => (TIER_ORDER[modelMap[a.model_id]?.price_tier] ?? 99) - (TIER_ORDER[modelMap[b.model_id]?.price_tier] ?? 99))

    const rows = sortedEntries.map(e => {
      const cellByLabel = {}
      for (const s of slotsByEntry[e.id] || []) cellByLabel[s.slot_label] = s
      return {
        model: modelMap[e.model_id],
        cells: Object.fromEntries(timeSlots.map(label => [label, cellByLabel[label] || null])),
      }
    })

    return { event, timeSlots, rows }
  })

  return Response.json({ events: result })
}
