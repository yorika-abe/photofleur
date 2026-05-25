import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ bookings: [] })
  if (!user.email) return Response.json({ bookings: [] })

  const admin = await createSupabaseAdminClient()

  // 通常予約
  const { data: bookings } = await admin
    .from('bookings')
    .select('id, name, created_at, final_price, is_outdoor, payment_method, slot_id, cancelled_at, qr_token')
    .eq('email', user.email)
    .order('created_at', { ascending: false })

  const slotIds = (bookings || []).map(b => b.slot_id).filter(Boolean)
  const { data: slots } = slotIds.length
    ? await admin.from('booking_slots').select('id, slot_label, event_entry_id, start_time, end_time, slot_order').in('id', slotIds)
    : { data: [] }

  const entryIds = (slots || []).map(s => s.event_entry_id).filter(Boolean)
  const { data: entries } = entryIds.length
    ? await admin.from('event_entries').select('id, event_id, model_id').in('id', entryIds)
    : { data: [] }

  const eventIds = (entries || []).map(e => e.event_id).filter(Boolean)
  const modelIds = [...new Set((entries || []).map(e => e.model_id).filter(Boolean))]
  const [{ data: events }, { data: modelRows }] = await Promise.all([
    eventIds.length
      ? admin.from('events').select('id, event_date, event_type, location_name, title').in('id', eventIds)
      : { data: [] },
    modelIds.length
      ? admin.from('models').select('id, name').in('id', modelIds)
      : { data: [] },
  ])

  const slotMap = Object.fromEntries((slots || []).map(s => [s.id, s]))
  const entryMap = Object.fromEntries((entries || []).map(e => [e.id, e]))
  const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]))
  const modelNameMap = Object.fromEntries((modelRows || []).map(m => [m.id, m.name]))

  const enriched = (bookings || []).map(b => {
    const slot = slotMap[b.slot_id]
    const entry = slot ? entryMap[slot.event_entry_id] : null
    const event = entry ? eventMap[entry.event_id] : null
    return {
      ...b,
      booking_type: 'regular',
      slot_label: slot?.slot_label || '',
      slot_order: slot?.slot_order ?? null,
      start_time: slot?.start_time || null,
      model_name: entry ? (modelNameMap[entry.model_id] || '') : '',
      event_date: event?.event_date || '',
      event_type: event?.event_type || '',
      event_title: event?.title || '',
      location_name: event?.location_name || '',
    }
  })

  // 非公開商品予約（リクエスト撮影確定後など）
  const { data: privateBookings } = await admin
    .from('private_bookings')
    .select('id, created_at, final_price, payment_method, cancelled_at, is_cancelled, event_date_input, meeting_place, shooting_time, qr_token, private_products(title, models(name), model_ids)')
    .eq('email', user.email)
    .order('created_at', { ascending: false })

  const enrichedPrivate = (privateBookings || []).map(b => {
    const prod = b.private_products
    const modelName = prod?.models?.name || ''
    return {
      id: b.id,
      booking_type: 'private',
      created_at: b.created_at,
      final_price: b.final_price || 0,
      payment_method: b.payment_method || null,
      cancelled_at: b.cancelled_at || (b.is_cancelled ? 'cancelled' : null),
      qr_token: b.qr_token || null,
      event_date: b.event_date_input || '',
      event_type: 'private',
      event_title: prod?.title || 'リクエスト撮影',
      location_name: b.meeting_place || '',
      slot_label: b.shooting_time || '',
      model_name: modelName,
    }
  })

  const all = [...enriched, ...enrichedPrivate].sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  )

  return Response.json({ bookings: all })
}
