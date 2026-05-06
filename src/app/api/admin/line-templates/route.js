import { createSupabaseAdminClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'

export const DEFAULTS = {
  shift_open: `🗓️シフト提出が解放されました。\nモデル画面から確認して提出してください。\n締め切りは{{deadline}}までです！`,
  shift_deadline_reminder: `お疲れ様です🎀🫧\n📢シフト提出締め切り前日になりました。\n\n未提出者は連絡確認次第モデルポータルからシフト提出日お願いします🙇‍♂️\n🔗${SITE_URL}`,
  event_publish: `📢開催イベントが解放されました。\n\n📍{{event_date}} {{title}}\n予約受付開始日→{{booking_open_at}}~\n\n詳細は🔗{{event_url}}`,
}

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const { data } = await supabase.from('line_templates').select('key, body')
  const templates = { ...DEFAULTS }
  for (const row of (data || [])) {
    templates[row.key] = row.body
  }
  return Response.json({ templates })
}

export async function PUT(req) {
  const supabase = await createSupabaseAdminClient()
  const { key, body } = await req.json()
  if (!DEFAULTS[key]) return Response.json({ error: 'invalid key' }, { status: 400 })
  await supabase.from('line_templates').upsert({ key, body, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return Response.json({ ok: true })
}
