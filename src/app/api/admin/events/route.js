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

export async function PATCH(req) {
  const supabase = await createSupabaseAdminClient()
  const { id, ...body } = await req.json()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  const { data: current } = await supabase.from('events').select('main_image, gallery_images').eq('id', id).single()
  if (current) {
    const toDelete = []
    if (current.main_image && current.main_image !== body.main_image && current.main_image.startsWith(base)) {
      toDelete.push(current.main_image.replace(base, ''))
    }
    const oldGallery = (() => { try { return JSON.parse(current.gallery_images || '[]') } catch { return [] } })()
    const newGallery = (() => { try { return JSON.parse(body.gallery_images || '[]') } catch { return [] } })()
    for (const url of oldGallery) {
      if (!newGallery.includes(url) && url.startsWith(base)) toDelete.push(url.replace(base, ''))
    }
    if (toDelete.length > 0) await supabase.storage.from('images').remove(toDelete)
  }

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
    // 予約履歴があるので完全削除せず非表示にする（メイン画像は残す、ギャラリーは削除）
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
    const { data: ev } = await supabase.from('events').select('gallery_images').eq('id', id).single()
    if (ev) {
      const gallery = (() => { try { return JSON.parse(ev.gallery_images || '[]') } catch { return [] } })()
      const toDelete = gallery.filter(url => url.startsWith(base)).map(url => url.replace(base, ''))
      if (toDelete.length > 0) await supabase.storage.from('images').remove(toDelete)
    }
    const { error } = await supabase.from('events').update({ is_visible: false, gallery_images: '[]' }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, archived: true, bookingCount })
  }

  // 予約なし → 完全削除（画像もストレージから削除）
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
  const { data: ev } = await supabase.from('events').select('main_image, gallery_images').eq('id', id).single()
  if (ev) {
    const toDelete = []
    if (ev.main_image?.startsWith(base)) toDelete.push(ev.main_image.replace(base, ''))
    const gallery = (() => { try { return JSON.parse(ev.gallery_images || '[]') } catch { return [] } })()
    for (const url of gallery) {
      if (url.startsWith(base)) toDelete.push(url.replace(base, ''))
    }
    if (toDelete.length > 0) await supabase.storage.from('images').remove(toDelete)
  }
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, archived: false })
}
