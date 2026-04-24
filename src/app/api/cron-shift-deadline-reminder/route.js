import { createClient } from '@supabase/supabase-js'
import { sendLineGroupMessage, buildShiftDeadlineReminderMessage } from '@/lib/line'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 明日（JST基準）= UTCで10:00に実行するので、tomorrow UTCがJSTの締め切り日と一致する
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: deadlines } = await supabase
    .from('shift_request_dates')
    .select('id')
    .eq('deadline', tomorrowStr)

  if (!deadlines || deadlines.length === 0) {
    return Response.json({ ok: true, sent: false, reason: 'no deadlines tomorrow' })
  }

  await sendLineGroupMessage(buildShiftDeadlineReminderMessage())

  return Response.json({ ok: true, sent: true })
}
