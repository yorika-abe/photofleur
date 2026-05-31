import { requireAdmin } from '@/lib/auth'
import { r2 } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

const SUPABASE_STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images`

// R2 URL → 元のSupabase URL に変換
function toSupabaseUrl(r2Url) {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
  if (!r2Url.startsWith(base + '/')) return null
  const path = r2Url.slice(base.length + 1)
  return `${SUPABASE_STORAGE_BASE}/${path}`
}

export async function POST() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: events } = await admin
    .from('events')
    .select('id, main_image, thumbnail_image')
    .order('event_date', { ascending: false })

  const results = []

  for (const ev of events || []) {
    for (const field of ['main_image', 'thumbnail_image']) {
      const r2Url = ev[field]
      if (!r2Url) continue

      // すでに正常なら skip
      try {
        const check = await fetch(r2Url, { method: 'HEAD' })
        if (check.ok) { results.push({ id: ev.id, field, status: 'ok', url: r2Url }); continue }
      } catch {}

      // Supabase URLを再構築してファイルを取得
      const supabaseUrl = toSupabaseUrl(r2Url)
      if (!supabaseUrl) { results.push({ id: ev.id, field, status: 'skip_unknown_url', url: r2Url }); continue }

      try {
        const res = await fetch(supabaseUrl)
        if (!res.ok) { results.push({ id: ev.id, field, status: `supabase_${res.status}`, url: supabaseUrl }); continue }

        const buf = Buffer.from(await res.arrayBuffer())
        const contentType = res.headers.get('content-type') || 'image/jpeg'

        const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
        const key = r2Url.slice(base.length + 1)

        await r2.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: buf,
          ContentType: contentType,
        }))

        results.push({ id: ev.id, field, status: 'fixed', key })
      } catch (e) {
        results.push({ id: ev.id, field, status: 'error', error: e.message })
      }
    }
  }

  return Response.json({ results, total: results.length })
}
