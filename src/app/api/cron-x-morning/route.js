import { createClient } from '@supabase/supabase-js'
import { TwitterApi } from 'twitter-api-v2'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

function applyVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

function formatDateRange(eventDate, eventEndDate) {
  if (!eventDate) return ''
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const d = new Date(eventDate + 'T00:00:00')
  const base = `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
  if (!eventEndDate || eventEndDate === eventDate) return base
  const ed = new Date(eventEndDate + 'T00:00:00')
  return `${base}〜${ed.getMonth() + 1}/${ed.getDate()}（${days[ed.getDay()]}）`
}

function buildBookingLabel(bookingOpenAt) {
  if (!bookingOpenAt) return ''
  const bd = new Date(bookingOpenAt)
  const jst = new Date(bd.getTime() + 9 * 60 * 60 * 1000)
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

async function postToX(text, imageUrl) {
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  })

  let mediaId
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer())
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        mediaId = await client.v1.uploadMedia(buffer, { mimeType })
      }
    } catch {}
  }

  const params = { text }
  if (mediaId) params.media = { media_ids: [mediaId] }
  return client.v2.tweet(params)
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const todayJST = jst.toISOString().slice(0, 10)

  const tomorrow = new Date(jst)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowJST = tomorrow.toISOString().slice(0, 10)

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.jp'

  // テンプレート取得
  const { data: tmplRows } = await supabase.from('line_templates').select('key, body')
  const templates = { ...DEFAULTS }
  for (const row of (tmplRows || [])) templates[row.key] = row.body

  let bookingOpenSent = 0, dayBeforeSent = 0

  // 1. 予約受付開始日のイベント（今日が booking_open_at の日付）
  const [byear, bmonth, bday] = todayJST.split('-').map(Number)
  const bDayStartUTC = new Date(Date.UTC(byear, bmonth - 1, bday, -9, 0, 0))
  const bDayEndUTC = new Date(Date.UTC(byear, bmonth - 1, bday, 15, 0, 0))

  const { data: bookingOpenEvents } = await supabase
    .from('events')
    .select('id, title, subtitle, description, event_date, event_end_date, booking_open_at, thumbnail_image')
    .eq('status', 'active')
    .gte('booking_open_at', bDayStartUTC.toISOString())
    .lt('booking_open_at', bDayEndUTC.toISOString())

  for (const ev of (bookingOpenEvents || [])) {
    const text = applyVars(templates.x_booking_open, {
      event_date: formatDateRange(ev.event_date, ev.event_end_date),
      title: ev.title || '',
      subtitle: ev.subtitle || '',
      description: ev.description || '',
      booking_open_at: buildBookingLabel(ev.booking_open_at),
      event_url: `${siteUrl}/schedule/${ev.id}`,
    })
    try {
      await postToX(text, ev.thumbnail_image || null)
      bookingOpenSent++
    } catch (e) {
      console.error('X booking open post error:', e)
    }
  }

  // 2. 前日投稿（明日が開催日のイベント）
  const { data: dayBeforeEvents } = await supabase
    .from('events')
    .select('id, title, subtitle, description, event_date, event_end_date, booking_open_at, thumbnail_image')
    .eq('status', 'active')
    .eq('event_date', tomorrowJST)

  for (const ev of (dayBeforeEvents || [])) {
    const text = applyVars(templates.x_day_before, {
      event_date: formatDateRange(ev.event_date, ev.event_end_date),
      title: ev.title || '',
      subtitle: ev.subtitle || '',
      description: ev.description || '',
      event_url: `${siteUrl}/schedule/${ev.id}`,
    })
    try {
      await postToX(text, ev.thumbnail_image || null)
      dayBeforeSent++
    } catch (e) {
      console.error('X day before post error:', e)
    }
  }

  return Response.json({ ok: true, bookingOpenSent, dayBeforeSent })
}
