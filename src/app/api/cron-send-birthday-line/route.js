import { createClient } from '@supabase/supabase-js'
import { sendLineGroupMessageToId } from '@/lib/line'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // JSTで今日の月日を取得（このcronは15:01 UTCに実行 = 00:01 JST）
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const month = jst.getUTCMonth() + 1
  const day = jst.getUTCDate()

  const { data: models } = await supabase
    .from('models')
    .select('id, name, birthday')
    .eq('status', 'active')
    .not('birthday', 'is', null)

  const targets = (models || []).filter(m => {
    const [, bMonth, bDay] = (m.birthday || '').split('-').map(Number)
    return bMonth === month && bDay === day
  })

  if (targets.length === 0) {
    return Response.json({ ok: true, sent: 0, message: '本日誕生日のモデルはいません' })
  }

  // 雑談グループIDをDBから取得（なければenv varにフォールバック）
  const { data: groupRow } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'line_group_id_zatsudan')
    .maybeSingle()
  const groupId = groupRow?.value || process.env.LINE_GROUP_ID

  // テンプレートをDBから取得
  const { data: tmplRow } = await supabase
    .from('line_templates')
    .select('body')
    .eq('key', 'birthday_msg')
    .maybeSingle()
  const template = tmplRow?.body || '今日は○○ちゃんの誕生日！\nお誕生日おめでとうございます💖\n素敵な1日になりますように❣️\n\nPhotoFleur運営'

  let sent = 0, failed = 0
  for (const model of targets) {
    const message = template.replace(/○○/g, model.name).replace(/\{\{name\}\}/g, model.name)
    const result = groupId
      ? await sendLineGroupMessageToId(groupId, message)
      : { ok: false, reason: 'no group id' }
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
