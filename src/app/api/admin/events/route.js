import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ events: data })
}

export async function POST(req) {
  const supabase = await createSupabaseAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('events').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}

export async function PUT(req) {
  const supabase = await createSupabaseAdminClient()
  const { id, ...body } = await req.json()
  const { data, error } = await supabase.from('events').update(body).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}

export async function DELETE(req) {
  const supabase = await createSupabaseAdminClient()
  const { id } = await req.json()

  // このイベントに紐づく予約が存在するか確認
  const { data: entries } = await supabase.from('event_entries').select('id').eq('event_id', id)
  const entryIds = (entries || []).map(e => e.id)

  let bookingCount = 0
  if (entryIds.length > 0) {
    const { data: slots } = await supabase.from('booking_slots').select('id').in('event_entry_id', entryIds)
    const slotIds = (slots || []).map(s => s.id)
    if (slotIds.length > 0) {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('slot_id', slotIds)
        .is('cancelled_at', null)
      bookingCount = count || 0
    }
  }

  if (bookingCount > 0) {
    // 予約履歴があるので完全削除せず非表示にする
    const { error } = await supabase.from('events').update({ is_visible: false }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, archived: true, bookingCount })
  }

  // 予約なし → 完全削除
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, archived: false })
}
