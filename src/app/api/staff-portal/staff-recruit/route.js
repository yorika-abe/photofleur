import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkStaff() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role, roles, name').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['staff', 'admin'].includes(r))) return null
  return { admin, user, profile }
}

export async function GET() {
  const ctx = await checkStaff()
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { admin, user } = ctx

  const { data: recruitments } = await admin
    .from('staff_recruitments')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: myApps } = await admin
    .from('staff_recruitment_applications')
    .select('*')
    .eq('user_id', user.id)

  const myAppsMap = {}
  for (const a of myApps || []) myAppsMap[a.recruitment_id] = a

  const { data: allApps } = await admin
    .from('staff_recruitment_applications')
    .select('recruitment_id, status')

  const countsMap = {}
  for (const a of allApps || []) {
    if (!countsMap[a.recruitment_id]) countsMap[a.recruitment_id] = { total: 0, confirmed: 0 }
    if (a.status !== 'cancelled') countsMap[a.recruitment_id].total++
    if (a.status === 'confirmed') countsMap[a.recruitment_id].confirmed++
  }

  const eventIds = [...new Set((recruitments || []).filter(r => r.event_id).map(r => r.event_id))]
  let eventsMap = {}
  if (eventIds.length > 0) {
    const { data } = await admin.from('events').select('id, title, subtitle, event_date, location').in('id', eventIds)
    for (const e of data || []) eventsMap[e.id] = e
  }

  const bookingIds = [...new Set((recruitments || []).filter(r => r.private_booking_id).map(r => r.private_booking_id))]
  let bookingsMap = {}
  if (bookingIds.length > 0) {
    const { data } = await admin.from('private_bookings')
      .select('id, event_date_input, meeting_place, shooting_time, private_products(title, models(name))')
      .in('id', bookingIds)
    for (const b of data || []) bookingsMap[b.id] = b
  }

  const result = (recruitments || []).map(r => ({
    ...r,
    event: r.event_id ? eventsMap[r.event_id] : null,
    booking: r.private_booking_id ? bookingsMap[r.private_booking_id] : null,
    my_application: myAppsMap[r.id] || null,
    counts: countsMap[r.id] || { total: 0, confirmed: 0 },
  }))

  const newCount = result.filter(r => r.status === 'open' && !r.my_application).length

  return Response.json({ recruitments: result, newCount })
}

export async function POST(req) {
  const ctx = await checkStaff()
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { admin, user, profile } = ctx

  const { recruitment_id } = await req.json()

  const { data: existing } = await admin
    .from('staff_recruitment_applications')
    .select('id')
    .eq('recruitment_id', recruitment_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return Response.json({ error: '既に応募済みです' }, { status: 400 })

  const { data: rec } = await admin.from('staff_recruitments').select('status, capacity').eq('id', recruitment_id).single()
  if (rec?.status !== 'open') return Response.json({ error: '募集は締め切りました' }, { status: 400 })

  await admin.from('staff_recruitment_applications').insert({
    recruitment_id,
    user_id: user.id,
    user_name: profile?.name || '',
    status: 'applied',
  })

  const { count } = await admin.from('staff_recruitment_applications')
    .select('*', { count: 'exact', head: true })
    .eq('recruitment_id', recruitment_id)
    .neq('status', 'cancelled')
  if (count >= rec.capacity) {
    await admin.from('staff_recruitments').update({ status: 'closed' }).eq('id', recruitment_id)
  }

  return Response.json({ ok: true })
}
