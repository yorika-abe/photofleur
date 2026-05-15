import { requireAdmin } from '@/lib/auth'

function get0buPrice(studioPrice) {
  if (studioPrice >= 12000) return 7500
  if (studioPrice >= 9900) return 5900
  return 4900
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { entryId, slot, event } = await req.json()
  const startTime = new Date(`${event.event_date}T${slot.start}:00+09:00`).toISOString()
  const endTime = new Date(`${event.event_date}T${slot.end}:00+09:00`).toISOString()
  const { data: entry } = await admin.from('event_entries').select('model_id').eq('id', entryId).single()
  const { data: model } = entry ? await admin.from('models').select('studio_price, street_price').eq('id', entry.model_id).single() : { data: null }
  const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
  const studioFee = parseInt(event.studio_fee) || 2000
  const basePrice = isStudioType
    ? (parseInt(model?.studio_price || 0) + studioFee)
    : parseInt(model?.street_price || 0)
  const price = (isStudioType && slot.order === 0) ? (get0buPrice(parseInt(model?.studio_price || 0)) + studioFee) : basePrice

  const { data } = await admin.from('booking_slots').insert({
    event_entry_id: entryId, slot_label: slot.label, slot_order: slot.order,
    start_time: startTime, end_time: endTime, price, max_reservations: 1, is_reserved: false,
  }).select('id, slot_label, slot_order, start_time, end_time, price, is_reserved, max_reservations').single()
  return Response.json({ slot: data })
}

export async function DELETE(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { slotId } = await req.json()
  await admin.from('booking_slots').delete().eq('id', slotId)
  return Response.json({ ok: true })
}

export async function PATCH(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { slotId, price, max_reservations } = await req.json()
  if (price !== undefined && (isNaN(price) || price < 0)) return Response.json({ error: '価格は0以上の値を入力してください' }, { status: 400 })
  const updates = {}
  if (price !== undefined) updates.price = price
  if (max_reservations !== undefined) updates.max_reservations = max_reservations
  await admin.from('booking_slots').update(updates).eq('id', slotId)
  return Response.json({ ok: true })
}
