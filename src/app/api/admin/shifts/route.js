import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

const DEFAULT_STUDIO_SLOTS = [
  { label: '0部 09:00〜09:45', start: '09:00', end: '09:45', order: 0 },
  { label: '1部 10:00〜11:00', start: '10:00', end: '11:00', order: 1 },
  { label: '2部 11:15〜12:15', start: '11:15', end: '12:15', order: 2 },
  { label: '3部 13:00〜14:00', start: '13:00', end: '14:00', order: 3 },
  { label: '4部 14:15〜15:15', start: '14:15', end: '15:15', order: 4 },
  { label: '5部 15:30〜16:30', start: '15:30', end: '16:30', order: 5 },
  { label: '6部 16:45〜17:45', start: '16:45', end: '17:45', order: 6 },
]
const DEFAULT_STREET_SLOTS = [
  { label: '1部 9:30〜11:00', start: '09:30', end: '11:00', order: 1 },
  { label: '2部 11:15〜12:45', start: '11:15', end: '12:45', order: 2 },
  { label: '3部 14:15〜15:45', start: '14:15', end: '15:45', order: 3 },
  { label: '4部 16:00〜17:30', start: '16:00', end: '17:30', order: 4 },
  { label: '5部 17:45〜19:15', start: '17:45', end: '19:15', order: 5 },
  { label: '6部 19:30〜20:45', start: '19:30', end: '20:45', order: 6 },
  { label: '7部 21:00〜22:30', start: '21:00', end: '22:30', order: 7 },
]

function get0buPrice(studioPrice) {
  if (studioPrice >= 12000) return 7500
  if (studioPrice >= 9900) return 5900
  return 4900
}

async function checkAdmin(admin) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return false
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin')
}

// UTCのISO文字列をJST HH:MM形式に変換
function toJSTTime(isoStr) {
  const d = new Date(isoStr)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

// シフト変更承認時に booking_slots を自動同期（削除＋追加）
async function syncBookingSlots(admin, shift) {
  const isUnavailable = shift.available_slots?.[0]?.unavailable === true
  const isAllDay = !isUnavailable && (!shift.available_from || !shift.available_until || (shift.available_from === '00:00' && shift.available_until === '00:00'))
  const from = shift.available_from
  const until = shift.available_until

  const [{ data: events }, { data: model }] = await Promise.all([
    admin.from('events').select('id, event_type, studio_fee, event_date').eq('event_date', shift.event_date),
    admin.from('models').select('studio_price, street_price').eq('id', shift.model_id).single(),
  ])
  if (!events?.length) return

  for (const event of events) {
    const { data: entry } = await admin
      .from('event_entries').select('id').eq('event_id', event.id).eq('model_id', shift.model_id).maybeSingle()
    if (!entry) continue

    const { data: slots } = await admin
      .from('booking_slots').select('id, start_time, end_time, is_reserved, slot_order, slot_label').eq('event_entry_id', entry.id)
    const currentSlots = slots || []

    if (isUnavailable) {
      const toDelete = currentSlots.filter(s => !s.is_reserved).map(s => s.id)
      if (toDelete.length) await admin.from('booking_slots').delete().in('id', toDelete)
      continue
    }

    // 範囲外スロットを削除
    if (!isAllDay) {
      const toDelete = currentSlots.filter(s => {
        if (s.is_reserved) return false
        const slotStart = toJSTTime(s.start_time)
        const slotEnd = toJSTTime(s.end_time)
        return slotStart < from || slotEnd > until
      }).map(s => s.id)
      if (toDelete.length) await admin.from('booking_slots').delete().in('id', toDelete)
    }

    // 追加: 他エントリからテンプレートを取得、なければデフォルトを使用
    const isStudioType = event.event_type === 'studio' || event.event_type === 'irregular'
    const studioFee = parseInt(event.studio_fee) || 2000
    const basePrice = isStudioType
      ? (parseInt(model?.studio_price || 0) + studioFee)
      : parseInt(model?.street_price || 0)

    let templateSlots = null
    const { data: otherEntries } = await admin
      .from('event_entries').select('id').eq('event_id', event.id).neq('model_id', shift.model_id).limit(1)
    if (otherEntries?.length) {
      const { data: ts } = await admin
        .from('booking_slots').select('slot_order, slot_label, start_time, end_time').eq('event_entry_id', otherEntries[0].id).order('slot_order')
      if (ts?.length) templateSlots = ts.map(s => ({ order: s.slot_order, label: s.slot_label, start: toJSTTime(s.start_time), end: toJSTTime(s.end_time), start_time: s.start_time, end_time: s.end_time }))
    }
    if (!templateSlots) {
      const defaults = isStudioType ? DEFAULT_STUDIO_SLOTS : DEFAULT_STREET_SLOTS
      templateSlots = defaults.map(s => ({
        order: s.order, label: s.label, start: s.start, end: s.end,
        start_time: new Date(`${event.event_date}T${s.start}:00+09:00`).toISOString(),
        end_time: new Date(`${event.event_date}T${s.end}:00+09:00`).toISOString(),
      }))
    }

    const existingOrders = new Set(currentSlots.map(s => s.slot_order))
    const toAdd = templateSlots.filter(ts => {
      if (existingOrders.has(ts.order)) return false
      if (isAllDay) return true
      return ts.start >= from && ts.end <= until
    })

    if (toAdd.length) {
      await admin.from('booking_slots').insert(toAdd.map(ts => ({
        event_entry_id: entry.id,
        slot_label: ts.label,
        slot_order: ts.order,
        start_time: ts.start_time,
        end_time: ts.end_time,
        price: (isStudioType && ts.order === 0) ? (get0buPrice(parseInt(model?.studio_price || 0)) + studioFee) : basePrice,
        max_reservations: 1,
        is_reserved: false,
      })))
    }
  }
}

export async function GET(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = admin
    .from('model_shifts')
    .select('*, models(id, name, image)')
    .order('event_date', { ascending: true })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function PATCH(req) {
  const admin = await createSupabaseAdminClient()
  if (!(await checkAdmin(admin))) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status } = await req.json()

  // 承認時は先にシフト情報を取得してスロット同期
  if (status === 'submitted') {
    const { data: shift } = await admin
      .from('model_shifts')
      .select('model_id, event_date, available_from, available_until, available_slots')
      .eq('id', id)
      .single()
    if (shift) await syncBookingSlots(admin, shift)
  }

  const { error } = await admin.from('model_shifts').update({ status }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
