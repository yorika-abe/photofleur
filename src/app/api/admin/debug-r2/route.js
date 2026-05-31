import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 直近10イベントのimage URLを確認
  const { data: events } = await admin
    .from('events')
    .select('id, title, event_date, main_image, thumbnail_image')
    .order('event_date', { ascending: false })
    .limit(10)

  const results = await Promise.all((events || []).map(async ev => {
    const urls = [ev.main_image, ev.thumbnail_image].filter(Boolean)
    const checks = await Promise.all(urls.map(async url => {
      try {
        const r = await fetch(url, { method: 'HEAD' })
        return { url, status: r.status, ok: r.ok }
      } catch (e) {
        return { url, error: e.message }
      }
    }))
    return { id: ev.id, title: ev.title, event_date: ev.event_date, image_checks: checks }
  }))

  return Response.json({ events: results })
}
