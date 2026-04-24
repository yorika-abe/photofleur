import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

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

// シフト変更承認時に booking_slots を自動同期
async function syncBookingSlots(admin, shift) {
  const isUnavailable = shift.available_slots?.[0]?.unavailable === true
  const isAllDay = !isUnavailable && shift.available_from === '00:00' && shift.available_until === '00:00'

  // 同日のイベントを検索
  const { data: events } = await admin
    .from('events')
    .select('id, event_type')
    .eq('event_date', shift.event_date)
  if (!events?.length) return

  for (const event of events) {
    const { data: entry } = await admin
      .from('event_entries')
      .select('id')
      .eq('event_id', event.id)
      .eq('model_id', shift.model_id)
      .maybeSingle()
    if (!entry) continue

    const { data: slots } = await admin
      .from('booking_slots')
      .select('id, start_time, end_time, is_reserved')
      .eq('event_entry_id', entry.id)
    if (!slots?.length) continue

    if (isUnavailable) {
      // 不参加: 未予約スロットをすべて削除
      const toDelete = slots.filter(s => !s.is_reserved).map(s => s.id)
      if (toDelete.length) await admin.from('booking_slots').delete().in('id', toDelete)
    } else if (!isAllDay) {
      // 時間指定: 提出時間範囲外の未予約スロットを削除
      const from = shift.available_from
      const until = shift.available_until
      const toDelete = slots.filter(s => {
        if (s.is_reserved) return false
        const slotStart = toJSTTime(s.start_time)
        const slotEnd = toJSTTime(s.end_time)
        return slotStart < from || slotEnd > until
      }).map(s => s.id)
      if (toDelete.length) await admin.from('booking_slots').delete().in('id', toDelete)
    }
    // 終日の場合はスロット変更なし
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
