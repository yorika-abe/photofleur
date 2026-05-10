import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import crypto from 'crypto'

function generateCouponCode() {
  return 'PF' + crypto.randomBytes(4).toString('hex').toUpperCase()
}

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin') ? admin : null
}

async function getStaffEmails(admin) {
  // model/admin/staff ロールを持つユーザーのメールを取得して除外対象にする
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, roles, role')
  const staffIds = (profiles || [])
    .filter(p => {
      const roles = p.roles?.length > 0 ? p.roles : (p.role ? [p.role] : [])
      return roles.some(r => ['admin', 'model', 'staff'].includes(r))
    })
    .map(p => p.id)
  if (staffIds.length === 0) return new Set()

  const staffEmails = new Set()
  // auth.users からメールを取得（最大1000件ずつ）
  let page = 1
  while (true) {
    const { data: { users }, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !users?.length) break
    for (const u of users) {
      if (staffIds.includes(u.id) && u.email) staffEmails.add(u.email.toLowerCase())
    }
    if (users.length < 1000) break
    page++
  }
  return staffEmails
}

async function getFilteredEmails(admin, filter = { type: 'all' }) {
  const staffEmails = await getStaffEmails(admin)
  const exclude = (emails) => emails.filter(e => !staffEmails.has(e.toLowerCase()))

  if (filter.type === 'event_date' && filter.date) {
    const { data: events } = await admin.from('events').select('id').eq('event_date', filter.date)
    if (!events?.length) return []
    const { data: entries } = await admin.from('event_entries').select('id').in('event_id', events.map(e => e.id))
    if (!entries?.length) return []
    const { data: slots } = await admin.from('booking_slots').select('id').in('event_entry_id', entries.map(e => e.id))
    if (!slots?.length) return []
    const { data: bookings } = await admin
      .from('bookings')
      .select('email')
      .eq('marketing_consent', true)
      .is('cancelled_at', null)
      .in('slot_id', slots.map(s => s.id))
    return exclude([...new Set((bookings || []).map(b => b.email).filter(Boolean))])
  }

  const { data: bookings } = await admin
    .from('bookings')
    .select('email, cancelled_at')
    .eq('marketing_consent', true)

  if (!bookings) return []

  if (filter.type === 'all') {
    return exclude([...new Set(bookings.map(b => b.email).filter(Boolean))])
  }

  if (filter.type === 'booking_count_gte') {
    const minCount = Number(filter.value) || 1
    const counts = {}
    for (const b of bookings) {
      if (!b.email || b.cancelled_at) continue
      counts[b.email] = (counts[b.email] || 0) + 1
    }
    return exclude(Object.entries(counts).filter(([, cnt]) => cnt >= minCount).map(([e]) => e))
  }

  if (filter.type === 'no_bookings') {
    const allEmails = [...new Set(bookings.map(b => b.email).filter(Boolean))]
    const withValid = new Set(bookings.filter(b => b.email && !b.cancelled_at).map(b => b.email))
    return exclude(allEmails.filter(e => !withValid.has(e)))
  }

  return []
}

export async function GET(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const filter = {
    type: searchParams.get('filter') || 'all',
    value: searchParams.get('value') || '',
    date: searchParams.get('date') || '',
  }

  const emails = await getFilteredEmails(admin, filter)

  // 開催日一覧（日付選択ドロップダウン用）
  const { data: events } = await admin
    .from('events')
    .select('event_date')
    .order('event_date', { ascending: false })
  const eventDates = [...new Set((events || []).map(e => e.event_date).filter(Boolean))]

  return Response.json({ count: emails.length, eventDates })
}

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, html, filter, couponConfig } = await req.json()
  if (!subject?.trim() || !html?.trim()) return Response.json({ error: 'subject and html required' }, { status: 400 })

  const emails = await getFilteredEmails(admin, filter || { type: 'all' })
  if (emails.length === 0) return Response.json({ error: '送信先がいません' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0, failed = 0
  for (const email of emails) {
    let personalizedHtml = html
    if (couponConfig) {
      const code = generateCouponCode()
      const validUntil = couponConfig.valid_days
        ? new Date(Date.now() + Number(couponConfig.valid_days) * 86400000).toISOString()
        : null
      await admin.from('coupons').insert({
        code,
        discount_type: couponConfig.discount_type || 'fixed',
        discount_value: Number(couponConfig.discount_value) || 0,
        max_uses: 1,
        valid_until: validUntil,
        description: couponConfig.description || 'メルマガクーポン',
        is_active: true,
      })
      personalizedHtml = personalizedHtml.replace(/\{\{unique_coupon\}\}/g, code)
    }
    const { error } = await resend.emails.send({
      from: 'PhotoFleur <noreply@photofleur.jp>',
      to: email,
      subject,
      html: personalizedHtml,
    })
    if (error) failed++; else sent++
  }

  return Response.json({ ok: true, sent, failed, total: emails.length })
}
