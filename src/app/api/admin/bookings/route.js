import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // 通常予約
  const { data: regularRaw } = await admin
    .from('bookings')
    .select('id, name, last_name, first_name, last_name_kana, first_name_kana, email, phone, sns_url, is_outdoor, final_price, qr_token, marketing_consent, created_at, slot_id, cancelled_at, payment_method, square_payment_id')
    .order('created_at', { ascending: false })

  // 非公開商品予約
  const { data: privateRaw } = await admin
    .from('private_bookings')
    .select('id, last_name, first_name, last_name_kana, first_name_kana, nickname, email, phone, sns_url, payment_method, notes, qr_token, cancelled_at, created_at, product_id, event_date_input, meeting_place, shooting_time, private_products(id, title, price, event_date, time_label, model_id, models(id, name))')
    .order('created_at', { ascending: false })

  // 特別予約商品
  const { data: epbRaw } = await admin
    .from('event_product_bookings')
    .select('id, customer_name, customer_email, customer_phone, sns_url, nickname, payment_method, qr_token, cancelled_at, created_at, product_id, event_id, selections, event_products(id, name, price)')
    .order('created_at', { ascending: false })

  const epEventIds = [...new Set((epbRaw || []).map(b => b.event_id).filter(Boolean))]
  const { data: epEvents } = epEventIds.length
    ? await admin.from('events').select('id, event_date, location_name').in('id', epEventIds)
    : { data: [] }
  const epEventMap = Object.fromEntries((epEvents || []).map(e => [e.id, e]))

  // グッズ注文
  const { data: goodsRaw } = await admin
    .from('goods_orders')
    .select('id, last_name, first_name, email, phone, payment_method, qr_token, cancelled_at, created_at, goods_id, quantity, notes, options_selected, delivery_address, sns_url, goods(id, title, price)')
    .order('created_at', { ascending: false })

  // 通常予約のslot/entry/event/model解決
  const slotIds = [...new Set((regularRaw || []).map(b => b.slot_id).filter(Boolean))]
  const { data: slots } = slotIds.length
    ? await admin.from('booking_slots').select('id, slot_label, price, event_entry_id').in('id', slotIds)
    : { data: [] }

  const entryIds = [...new Set((slots || []).map(s => s.event_entry_id).filter(Boolean))]
  const { data: entries } = entryIds.length
    ? await admin.from('event_entries').select('id, event_id, model_id').in('id', entryIds)
    : { data: [] }

  const eventIds = [...new Set((entries || []).map(e => e.event_id).filter(Boolean))]
  const modelIds = [...new Set((entries || []).map(e => e.model_id).filter(Boolean))]
  const [{ data: events }, { data: models }] = await Promise.all([
    eventIds.length ? admin.from('events').select('id, event_date, event_type, location_name').in('id', eventIds) : { data: [] },
    modelIds.length ? admin.from('models').select('id, name').in('id', modelIds) : { data: [] },
  ])

  const slotMap = Object.fromEntries((slots || []).map(s => [s.id, s]))
  const entryMap = Object.fromEntries((entries || []).map(e => [e.id, e]))
  const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]))
  const modelMap = Object.fromEntries((models || []).map(m => [m.id, m]))

  const regular = (regularRaw || []).map(b => {
    const slot = slotMap[b.slot_id] || {}
    const entry = entryMap[slot.event_entry_id] || {}
    const event = eventMap[entry.event_id] || {}
    const model = modelMap[entry.model_id] || {}
    return { ...b, _type: 'regular', slot, event, model }
  })

  const privateBookings = (privateRaw || []).map(b => ({
    ...b,
    _type: 'private',
    name: `${b.last_name}${b.first_name ? ` ${b.first_name}` : ''}`,
    product: b.private_products || {},
    model: b.private_products?.models || {},
    event: b.private_products?.event_date ? { event_date: b.private_products.event_date } : {},
    slot: { slot_label: b.private_products?.time_label || '' },
    final_price: b.private_products?.price || 0,
  }))

  const epBookings = (epbRaw || []).map(b => ({
    ...b,
    _type: 'event_product',
    name: b.customer_name || '',
    email: b.customer_email || '',
    phone: b.customer_phone || null,
    product: b.event_products || {},
    model: {},
    event: epEventMap[b.event_id] || {},
    slot: { slot_label: b.selections?.slot || '' },
    final_price: b.event_products?.price || 0,
  }))

  const goodsBookings = (goodsRaw || []).map(b => ({
    ...b,
    _type: 'goods',
    name: `${b.last_name || ''}${b.first_name ? ` ${b.first_name}` : ''}`,
    product: b.goods || {},
    model: {},
    event: {},
    slot: { slot_label: '' },
    final_price: (b.goods?.price || 0) * (b.quantity || 1),
  }))

  const merged = [...regular, ...privateBookings, ...epBookings, ...goodsBookings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return Response.json({ bookings: merged })
}
