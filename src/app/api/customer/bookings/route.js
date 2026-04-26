import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ bookings: [] })

  const admin = await createSupabaseAdminClient()
  const { data: bookings } = await admin
    .from('bookings')
    .select('id, name, created_at, final_price, is_outdoor, payment_method, slot_id')
    .eq('email', user.email)
    .order('created_at', { ascending: false })

  if (!bookings || bookings.length === 0) return Response.json({ bookings: [] })

  const slotIds = bookings.map(b => b.slot_id).filter(Boolean)
  const { data: slots } = await admin
    .from('booking_slots')
    .select('id, slot_label, event_entry_id, start_time, end_time, slot_order')
    .in('id', slotIds)

  const entryIds = (slots || []).map(s => s.event_entry_id).filter(Boolean)
  const { data: entries } = entryIds.length
    ? await admin.from('event_entries').select('id, event_id, models(name)').in('id', entryIds)
    : { data: [] }

  const eventIds = (entries || []).map(e => e.event_id).filter(Boolean)
  const { data: events } = eventIds.length
    ? await admin.from('events').select('id, event_date, event_type, location_name, title').in('id', eventIds)
    : { data: [] }

  const slotMap = Object.fromEntries((slots || []).map(s => [s.id, s]))
  const entryMap = Object.fromEntries((entries || []).map(e => [e.id, e]))
  const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]))

  const enriched = bookings.map(b => {
    const slot = slotMap[b.slot_id]
    const entry = slot ? entryMap[slot.event_entry_id] : null
    const event = entry ? eventMap[entry.event_id] : null
    return {
      ...b,
      slot_label: slot?.slot_label || '',
      slot_order: slot?.slot_order ?? null,
      model_name: entry?.models?.name || '',
      event_date: event?.event_date || '',
      event_type: event?.event_type || '',
      event_title: event?.title || '',
      location_name: event?.location_name || '',
    }
  })

  return Response.json({ bookings: enriched })
}
