import { requireAdmin } from '@/lib/auth'
import { deleteFromR2 } from '@/lib/r2'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await admin
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ events: data })
}

export async function POST(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await admin.from('events').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}

export async function PUT(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...body } = await req.json()
  const { data, error } = await admin.from('events').update(body).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}

export async function PATCH(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...body } = await req.json()

  const { data: current } = await admin.from('events').select('main_image, thumbnail_image, gallery_images').eq('id', id).single()
  if (current) {
    const toDelete = []
    if (current.main_image && current.main_image !== body.main_image) toDelete.push(current.main_image)
    if (current.thumbnail_image && current.thumbnail_image !== body.thumbnail_image) toDelete.push(current.thumbnail_image)
    const oldGallery = (() => { try { return JSON.parse(current.gallery_images || '[]') } catch { return [] } })()
    const newGallery = (() => { try { return JSON.parse(body.gallery_images || '[]') } catch { return [] } })()
    for (const url of oldGallery) {
      if (!newGallery.includes(url)) toDelete.push(url)
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }

  const { data, error } = await admin.from('events').update(body).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}

export async function DELETE(req) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()

  const { data: entries } = await admin.from('event_entries').select('id').eq('event_id', id)
  const entryIds = (entries || []).map(e => e.id)

  let bookingCount = 0
  if (entryIds.length > 0) {
    const { data: slots } = await admin.from('booking_slots').select('id').in('event_entry_id', entryIds)
    const slotIds = (slots || []).map(s => s.id)
    if (slotIds.length > 0) {
      const { count } = await admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('slot_id', slotIds)
        .is('cancelled_at', null)
      bookingCount = count || 0
    }
  }

  if (bookingCount > 0) {
    // 予約履歴があるので完全削除せず非表示にする（メイン画像は残す、ギャラリーは削除）
    const { data: ev } = await admin.from('events').select('gallery_images').eq('id', id).single()
    if (ev) {
      const gallery = (() => { try { return JSON.parse(ev.gallery_images || '[]') } catch { return [] } })()
      if (gallery.length > 0) await deleteFromR2(gallery)
    }
    const { error } = await admin.from('events').update({ is_visible: false, gallery_images: '[]' }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, archived: true, bookingCount })
  }

  // 予約なし → 完全削除（画像もストレージから削除）
  const { data: ev } = await admin.from('events').select('main_image, gallery_images').eq('id', id).single()
  if (ev) {
    const toDelete = []
    if (ev.main_image) toDelete.push(ev.main_image)
    const gallery = (() => { try { return JSON.parse(ev.gallery_images || '[]') } catch { return [] } })()
    toDelete.push(...gallery)
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }
  const { error } = await admin.from('events').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, archived: false })
}
