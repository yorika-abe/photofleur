import { createClient } from '@supabase/supabase-js'
import { sendLineMessage } from '@/lib/line'

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('cron_secret')
  const secret = authHeader?.replace('Bearer ', '') || querySecret
  if (secret !== process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // 通知済み・未回答の申請モデルを取得
  // notified_at から2日後 = 今日 かつ reminder_sent_at が null のもの
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const twoDaysAgoStart = new Date(twoDaysAgo)
  twoDaysAgoStart.setHours(0, 0, 0, 0)
  const twoDaysAgoEnd = new Date(twoDaysAgo)
  twoDaysAgoEnd.setHours(23, 59, 59, 999)

  const { data: appModels } = await supabase
    .from('request_application_models')
    .select('id, application_id, model_id, notified_at, reminder_sent_at, models(name, line_id)')
    .gte('notified_at', twoDaysAgoStart.toISOString())
    .lte('notified_at', twoDaysAgoEnd.toISOString())
    .is('reminder_sent_at', null)

  if (!appModels?.length) return Response.json({ ok: true, sent: 0 })

  // 未回答のもののみリマインダー送信
  const appModelIds = appModels.map(m => m.id)
  const { data: responses } = await supabase
    .from('model_request_responses')
    .select('application_model_id')
    .in('application_model_id', appModelIds)

  const respondedIds = new Set((responses || []).map(r => r.application_model_id))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://photofleur.vercel.app'
  let sent = 0

  for (const am of appModels) {
    if (respondedIds.has(am.id)) continue
    if (!am.models?.line_id) continue

    await sendLineMessage(am.models.line_id,
      `【🔗リク撮依頼が入りました】\nHPから詳細を確認して参加可否を\n⚠️本日中に回答してください。\n${siteUrl}/model-portal/request-applications`
    )
    await supabase.from('request_application_models')
      .update({ reminder_sent_at: now.toISOString() })
      .eq('id', am.id)
    sent++
  }

  return Response.json({ ok: true, sent })
}
