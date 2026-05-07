import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['model', 'admin'].includes(r))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let model
  if (roles.includes('admin')) {
    const { searchParams } = new URL(req.url)
    const modelId = searchParams.get('model_id')
    if (modelId) {
      const { data } = await admin.from('models').select('id').eq('id', modelId).single()
      model = data
    } else {
      // admin who is also a model: look up by user_id
      const { data } = await admin.from('models').select('id').eq('user_id', user.id).single()
      model = data
    }
  } else {
    const { data } = await admin.from('models').select('id').eq('user_id', user.id).single()
    model = data
  }

  if (!model) return Response.json({ events: [] })

  const today = new Date().toISOString().split('T')[0]

  // モデルが参加するエントリーを取得
  const { data: entries } = await admin
    .from('event_entries')
    .select('id, event_id')
    .eq('model_id', model.id)

  if (!entries || entries.length === 0) return Response.json({ events: [], past: [] })

  const eventIds = entries.map(e => e.event_id).filter(Boolean)
  const { data: eventsData } = eventIds.length
    ? await admin.from('events').select('id, event_date, event_type, title, location_name, status').in('id', eventIds)
    : { data: [] }

  const eventMap = Object.fromEntries((eventsData || []).map(ev => [ev.id, ev]))

  const allEntries = entries
    .map(e => ({ ...e, events: eventMap[e.event_id] || null }))
    .filter(e => e.events && e.events.status !== 'cancelled')

  const upcomingEntries = allEntries
    .filter(e => e.events.event_date >= today)
    .sort((a, b) => a.events.event_date.localeCompare(b.events.event_date))

  const pastEntries = allEntries
    .filter(e => e.events.event_date < today)
    .sort((a, b) => b.events.event_date.localeCompare(a.events.event_date)) // 新しい順

  const entryIds = allEntries.map(e => e.id)
  if (entryIds.length === 0) return Response.json({ events: [], past: [] })

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
        .select('slot_id, last_name, first_name, nickname, sns_url, cancelled_at, created_at')
        .in('slot_id', slotIds)
        .is('cancelled_at', null)
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

  const toEventItem = e => ({
    event: e.events,
    slots: (slotsByEntry[e.id] || []).filter(s => s.slot_order !== 0),
  })

  // 特別予約商品（notify_model有効・このモデルが含まれる）
  const { data: allEventProducts } = await admin
    .from('event_products')
    .select('id, name, options, event_id')

  const myProducts = (allEventProducts || []).filter(p => {
    if (p.options?.notify_model === false) return false
    const layers = p.options?.type === 'layers' ? (p.options.layers || []) : (p.options?.groups || [])
    const modelLayer = layers.find(l => l.type === 'models')
    return (modelLayer?.model_choices || []).some(mc => mc.model_id === model.id)
  })

  let productBookings = []
  if (myProducts.length > 0) {
    const { data: epBookings } = await admin
      .from('event_product_bookings')
      .select('id, product_id, selections, nickname, sns_url, created_at')
      .in('product_id', myProducts.map(p => p.id))
      .is('cancelled_at', null)
      .order('created_at', { ascending: false })

    const productEventIds = [...new Set(myProducts.map(p => p.event_id).filter(Boolean))]
    const { data: productEvents } = productEventIds.length
      ? await admin.from('events').select('id, event_date, event_type, title').in('id', productEventIds)
      : { data: [] }
    const eventById = Object.fromEntries((productEvents || []).map(e => [e.id, e]))

    for (const p of myProducts) {
      const pBookings = (epBookings || []).filter(b => b.product_id === p.id)
      if (pBookings.length === 0) continue
      productBookings.push({
        product: { id: p.id, name: p.name },
        event: eventById[p.event_id] || null,
        bookings: pBookings,
      })
    }
    productBookings.sort((a, b) =>
      (a.event?.event_date || '').localeCompare(b.event?.event_date || '')
    )
  }

  // 非公開予約
  const { data: privateProducts } = await admin
    .from('private_products')
    .select('id, title')
    .eq('model_id', model.id)

  let privateBookings = []
  if (privateProducts && privateProducts.length > 0) {
    const { data: pbData } = await admin
      .from('private_bookings')
      .select('id, product_id, event_date_input, meeting_place, shooting_time, nickname, sns_url, created_at')
      .in('product_id', privateProducts.map(p => p.id))
      .is('cancelled_at', null)
      .order('event_date_input', { ascending: true })
    const productTitleMap = Object.fromEntries((privateProducts || []).map(p => [p.id, p.title]))
    privateBookings = (pbData || []).map(b => ({ ...b, product_title: productTitleMap[b.product_id] || '非公開予約' }))
  }

  return Response.json({
    events: upcomingEntries.map(toEventItem),
    past: pastEntries.map(toEventItem),
    productBookings,
    privateBookings,
  })
}
