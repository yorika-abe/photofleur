import { createSupabaseAdminClient } from '@/lib/supabase-server'

function get0buPrice(studioPrice) {
  if (studioPrice >= 12000) return 7500
  if (studioPrice >= 9900) return 5900
  return 4900
}

export async function POST(req) {
  const { entryId, slot, event } = await req.json()
  const supabase = await createSupabaseAdminClient()
  const startTime = new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString()
  const endTime = new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString()
  const { data: entry } = await supabase.from('event_entries').select('model_id').eq('id', entryId).single()
  const { data: model } = entry ? await supabase.from('models').select('studio_price, street_price').eq('id', entry.model_id).single() : { data: null }
  const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
  const basePrice = isStudioType
    ? (parseInt(model?.studio_price || 0) + (parseInt(event.studio_fee) || 2000))
    : parseInt(model?.street_price || 0)
  const price = (isStudioType && slot.order === 0) ? get0buPrice(parseInt(model?.studio_price || 0)) : basePrice

  const { data } = await supabase.from('booking_slots').insert({
    event_entry_id: entryId, slot_label: slot.label, slot_order: slot.order,
    start_time: startTime, end_time: endTime, price, max_reservations: 1, is_reserved: false,
  }).select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations').single()
  return Response.json({ slot: data })
}

export async function DELETE(req) {
  const { slotId } = await req.json()
  const supabase = await createSupabaseAdminClient()
  await supabase.from('booking_slots').delete().eq('id', slotId)
  return Response.json({ ok: true })
}

export async function PATCH(req) {
  const { slotId, price, max_reservations } = await req.json()
  const supabase = await createSupabaseAdminClient()
  const updates = {}
  if (price !== undefined) updates.price = price
  if (max_reservations !== undefined) updates.max_reservations = max_reservations
  await supabase.from('booking_slots').update(updates).eq('id', slotId)
  return Response.json({ ok: true })
}
