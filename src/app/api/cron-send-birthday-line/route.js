import { createClient } from '@supabase/supabase-js'
import { sendLineGroupMessage } from '@/lib/line'

function buildBirthdayMessage(name) {
  return `今日は${name}ちゃんの誕生日！\nお誕生日おめでとうございます💖\n素敵な1日になりますように❣️\n\nPhotoFleur運営`
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

  // JSTで今日の月日を取得（このcronは15:00 UTCに実行 = 00:00 JST）
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const month = jst.getUTCMonth() + 1
  const day = jst.getUTCDate()

  const { data: models } = await supabase
    .from('models')
    .select('id, name, birthday')
    .eq('is_active', true)
    .not('birthday', 'is', null)

  const targets = (models || []).filter(m => {
    const [, bMonth, bDay] = (m.birthday || '').split('-').map(Number)
    return bMonth === month && bDay === day
  })

  if (targets.length === 0) {
    return Response.json({ ok: true, sent: 0, message: '本日誕生日のモデルはいません' })
  }

  let sent = 0, failed = 0
  for (const model of targets) {
    const message = buildBirthdayMessage(model.name)
    const result = await sendLineGroupMessage(message)
    if (result.ok) sent++
    else failed++
    await supabase.from('line_notifications').insert({
      model_id: model.id,
      type: 'birthday',
      message,
      status: result.ok ? 'sent' : 'failed',
    }).catch(() => {})
  }

  return Response.json({ ok: true, sent, failed, targets: targets.map(m => m.name) })
}
