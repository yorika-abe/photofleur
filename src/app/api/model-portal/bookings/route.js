import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'model' && profile?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: model } = await admin.from('models').select('id').eq('user_id', user.id).single()
  if (!model) return Response.json({ events: [] })

  const today = new Date().toISOString().split('T')[0]

  // モデルが参加するイベントを取得
  const { data: entries } = await admin
    .from('event_entries')
    .select('id, events(id, event_date, event_type, title, location_name, status)')
    .eq('model_id', model.id)

  const upcomingEntries = (entries || []).filter(e =>
    e.events && e.events.status === 'active' && e.events.event_date >= today
  ).sort((a, b) => a.events.event_date.localeCompare(b.events.event_date))

  if (upcomingEntries.length === 0) return Response.json({ events: [] })

  const entryIds = upcomingEntries.map(e => e.id)

  // 予約枠を取得
  const { data: slots } = await admin
    .from('booking_slots')
    .select('id, slot_label, start_time, slot_order, event_entry_id')
    .in('event_entry_id', entryIds)
    .order('slot_order', { ascending: true })

  const slotIds = (slots || []).map(s => s.id)

  // 予約情報を取得（SNS URL含む）
  const { data: bookings } = slotIds.length
    ? await admin
        .from('bookings')
        .select('slot_id, last_name, first_name, sns_url')
        .in('slot_id', slotIds)
    : { data: [] }

  const bookingsBySlot = {}
  for (const b of bookings || []) {
    bookingsBySlot[b.slot_id] = b
  }

  const slotsByEntry = {}
  for (const s of slots || []) {
    if (!slotsByEntry[s.event_entry_id]) slotsByEntry[s.event_entry_id] = []
    slotsByEntry[s.event_entry_id].push({
      ...s,
      booking: bookingsBySlot[s.id] || null,
    })
  }

  const events = upcomingEntries.map(e => ({
    event: e.events,
    slots: (slotsByEntry[e.id] || []).filter(s => s.slot_order !== 0),
  }))

  return Response.json({ events })
}
