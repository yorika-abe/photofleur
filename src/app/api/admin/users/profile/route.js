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
    { data: bookings },
    { data: privateBookings },
    { data: epBookings },
  ] = await Promise.all([
    admin.from('user_profiles')
      .select('id, name, email, phone, nickname, first_name, last_name, sns_url, roles, role, created_at, is_blocked')
      .eq('email', email)
      .maybeSingle(),
    admin.from('bookings')
      .select('id, created_at, cancelled_at, final_price, payment_method, slot_id, event_slots(id, label, event_id, events(id, title, event_date, location_name))')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(30),
    admin.from('private_bookings')
      .select('id, created_at, cancelled_at, payment_method, private_products(id, title, price, event_date)')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10),
    admin.from('event_product_bookings')
      .select('id, created_at, cancelled_at, payment_method, total_price, product_id, event_id, event_products(id, name, price), events(id, event_date, location_name)')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const normalized = [
    ...(bookings || []).map(b => ({
      id: b.id,
      type: 'regular',
      event_date: b.event_slots?.events?.event_date || null,
      event_title: b.event_slots?.events?.title || null,
      location_name: b.event_slots?.events?.location_name || null,
      slot_label: b.event_slots?.label || null,
      final_price: b.final_price,
      payment_method: b.payment_method,
      cancelled_at: b.cancelled_at,
      created_at: b.created_at,
    })),
    ...(privateBookings || []).map(b => ({
      id: b.id,
      type: 'private',
      event_date: b.private_products?.event_date || null,
      event_title: b.private_products?.title || null,
      location_name: null,
      slot_label: null,
      final_price: b.private_products?.price || null,
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
      final_price: b.total_price || b.event_products?.price || null,
      payment_method: b.payment_method,
      cancelled_at: b.cancelled_at,
      created_at: b.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return Response.json({ profile: profile || null, bookings: normalized })
}
