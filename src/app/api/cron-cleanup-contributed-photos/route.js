import { createClient } from '@supabase/supabase-js'
import { deleteFromR2 } from '@/lib/r2'

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('cron_secret')
  const secret = authHeader?.replace('Bearer ', '') || querySecret
  if (secret !== process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 2ヶ月以上前のご提供写真を取得
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  const { data: old, error } = await supabase
    .from('contributed_photos')
    .select('id, photo_url')
    .lt('created_at', twoMonthsAgo.toISOString())

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!old || old.length === 0) return Response.json({ ok: true, deleted: 0 })

  // R2から画像削除
  const urls = old.map(p => p.photo_url).filter(Boolean)
  if (urls.length > 0) await deleteFromR2(urls)

  // DBからレコード削除
  const ids = old.map(p => p.id)
  await supabase.from('contributed_photos').delete().in('id', ids)

  return Response.json({ ok: true, deleted: ids.length })
}
