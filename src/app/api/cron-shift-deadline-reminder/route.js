import { createClient } from '@supabase/supabase-js'
import { sendLineGroupMessage, buildShiftDeadlineReminderMessage } from '@/lib/line'

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('cron_secret')
  const secret = authHeader?.replace('Bearer ', '') || querySecret
  if (secret !== process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 22:00 UTC = 07:00 JST（翌日）→ JSTで「明日」の日付を取得
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const jstTomorrow = new Date(jst)
  jstTomorrow.setUTCDate(jstTomorrow.getUTCDate() + 1)
  const tomorrowStr = jstTomorrow.toISOString().split('T')[0]

  const { data: deadlines } = await supabase
    .from('shift_request_dates')
    .select('id')
    .eq('deadline', tomorrowStr)

  if (!deadlines || deadlines.length === 0) {
    return Response.json({ ok: true, sent: false, reason: 'no deadlines tomorrow' })
  }

  // DBにカスタムテンプレートがあれば使用、なければデフォルト
  const { data: tmpl } = await supabase.from('line_templates').select('body').eq('key', 'shift_deadline_reminder').single()
  const message = tmpl?.body ?? buildShiftDeadlineReminderMessage()

  await sendLineGroupMessage(message)

  return Response.json({ ok: true, sent: true })
}
