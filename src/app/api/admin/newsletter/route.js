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

  function chunks(arr, size) {
    const result = []
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
    return result
  }

  let sent = 0, failed = 0

  if (couponConfig) {
    // クーポンあり: 1件ずつ個別コード生成が必要なため、メール配列を組み立ててからバッチ送信
    const validUntil = couponConfig.valid_days
      ? new Date(Date.now() + Number(couponConfig.valid_days) * 86400000).toISOString()
      : null

    const emailPayloads = []
    for (const email of emails) {
      const code = generateCouponCode()
      await admin.from('coupons').insert({
        code,
        discount_type: couponConfig.discount_type || 'fixed',
        discount_value: Number(couponConfig.discount_value) || 0,
        max_uses: 1,
        valid_until: validUntil,
        description: couponConfig.description || 'メルマガクーポン',
        is_active: true,
      })
      emailPayloads.push({
        from: 'PhotoFleur <noreply@photofleur.jp>',
        to: email,
        subject,
        html: html.replace(/\{\{unique_coupon\}\}/g, code),
      })
    }

    for (const chunk of chunks(emailPayloads, 100)) {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      })
      if (res.ok) {
        sent += chunk.length
      } else {
        failed += chunk.length
      }
    }
  } else {
    // クーポンなし: メール配列を組み立ててバッチ送信
    const emailPayloads = emails.map(email => ({
      from: 'PhotoFleur <noreply@photofleur.jp>',
      to: email,
      subject,
      html,
    }))

    for (const chunk of chunks(emailPayloads, 100)) {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      })
      if (res.ok) {
        sent += chunk.length
      } else {
        failed += chunk.length
      }
    }
  }

  return Response.json({ ok: true, sent, failed, total: emails.length })
}
