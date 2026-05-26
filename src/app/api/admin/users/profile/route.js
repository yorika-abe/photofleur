import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email) return Response.json({ error: 'Missing email' }, { status: 400 })

  const [
    { data: profile },
    { data: rawBookings },
    { data: privateBookings },
    { data: epBookings },
  ] = await Promise.all([
    admin.from('user_profiles')
      .select('id, name, email, roles, role, created_at, is_blocked')
      .eq('email', email)
      .maybeSingle(),
    admin.from('bookings')
      .select('id, created_at, cancelled_at, final_price, payment_method, slot_id, nickname, phone, sns_url')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(30),
    admin.from('private_bookings')
      .select('id, created_at, cancelled_at, payment_method, final_price, event_date_input, meeting_place, shooting_time, private_products(id, title, price, event_date, models(name))')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10),
    admin.from('event_product_bookings')
      .select('id, created_at, cancelled_at, payment_method, total_price, product_id, event_id, event_products(id, name, price), events(id, event_date, location_name)')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Enrich regular bookings via booking_slots → event_entries → events + models
  const slotIds = (rawBookings || []).map(b => b.slot_id).filter(Boolean)
  const { data: slots } = slotIds.length
    ? await admin.from('booking_slots').select('id, slot_label, event_entry_id').in('id', slotIds)
    : { data: [] }

  const entryIds = (slots || []).map(s => s.event_entry_id).filter(Boolean)
  const { data: entries } = entryIds.length
    ? await admin.from('event_entries').select('id, event_id, model_id').in('id', entryIds)
    : { data: [] }

  const eventIds = (entries || []).map(e => e.event_id).filter(Boolean)
  const modelIds = [...new Set((entries || []).map(e => e.model_id).filter(Boolean))]
  const [{ data: events }, { data: modelRows }] = await Promise.all([
    eventIds.length
      ? admin.from('events').select('id, title, event_date, location_name').in('id', eventIds)
      : { data: [] },
    modelIds.length
      ? admin.from('models').select('id, name').in('id', modelIds)
      : { data: [] },
  ])

  const slotMap = Object.fromEntries((slots || []).map(s => [s.id, s]))
  const entryMap = Object.fromEntries((entries || []).map(e => [e.id, e]))
  const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]))
  const modelNameMap = Object.fromEntries((modelRows || []).map(m => [m.id, m.name]))

  const bookings = [
    ...(rawBookings || []).map(b => {
      const slot = slotMap[b.slot_id]
      const entry = slot ? entryMap[slot.event_entry_id] : null
      const event = entry ? eventMap[entry.event_id] : null
      return {
        id: b.id,
        type: 'regular',
        event_date: event?.event_date || null,
        event_title: event?.title || null,
        location_name: event?.location_name || null,
        slot_label: slot?.slot_label || null,
        model_name: entry ? (modelNameMap[entry.model_id] || null) : null,
        final_price: b.final_price,
        payment_method: b.payment_method,
        cancelled_at: b.cancelled_at,
        created_at: b.created_at,
      }
    }),
    ...(privateBookings || []).map(b => ({
      id: b.id,
      type: 'private',
      event_date: b.event_date_input || b.private_products?.event_date || null,
      event_title: b.private_products?.title || 'リクエスト撮影',
      location_name: b.meeting_place || null,
      slot_label: b.shooting_time || null,
      model_name: b.private_products?.models?.name || null,
      final_price: b.final_price || b.private_products?.price || null,
      payment_method: b.payment_method,
      cancelled_at: b.cancelled_at,
      created_at: b.created_at,
    })),
    ...(epBookings || []).map(b => ({
      id: b.id,
      type: 'event_product',
      event_date: b.events?.event_date || null,
      event_title: b.event_products?.name || null,
      location_name: b.events?.location_name || null,
      slot_label: null,
      model_name: null,
      final_price: b.total_price || b.event_products?.price || null,
      payment_method: b.payment_method,
      cancelled_at: b.cancelled_at,
      created_at: b.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // Get contact info from most recent regular booking
  const recentBooking = (rawBookings || [])[0]
  const contactInfo = {
    nickname: recentBooking?.nickname || null,
    phone: recentBooking?.phone || null,
    sns_url: recentBooking?.sns_url || null,
  }

  return Response.json({ profile: profile ? { ...profile, ...contactInfo } : null, bookings })
}
