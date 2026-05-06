import { createSupabaseAdminClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'

export const DEFAULTS = {
  shift_open: `🗓️シフト提出が解放されました。\nモデル画面から確認して提出してください。\n締め切りは{{deadline}}までです！`,
  shift_deadline_reminder: `お疲れ様です🎀🫧\n📢シフト提出締め切り前日になりました。\n\n未提出者は連絡確認次第モデルポータルからシフト提出日お願いします🙇‍♂️\n🔗${SITE_URL}`,
  event_publish: `📢開催イベントが解放されました。\n\n📍{{event_date}} {{title}}\n予約受付開始日→{{booking_open_at}}~\n\n詳細は🔗{{event_url}}`,
  model_booking_notify: `【PhotoFleur】予約が入りました🌸\n\nモデル名：{{model_name}}\n撮影日：{{event_date}}\n時間枠：{{slot_label}}\nお客様名：{{customer_name}}\n\n詳細は管理画面をご確認ください。`,
  model_day_before: `【PhotoFleur】明日の撮影のお知らせ🌸\n\n{{event_date}}（明日）の撮影があります。\n\n時間枠：{{slot_label}}\n集合場所：{{location_name}}\n\nよろしくお願いいたします。`,
  camera_event_publish: `【イベント公開のお知らせ📸】\n\n{{event_date}}📍{{title}}\n{{subtitle}}\nのイベント詳細が公開されました！\n\n{{description}}\n\n予約受付開始は\n🗓️{{booking_open_at}}〜\n\nイベント詳細はリンクからご確認ください💖\n🔗{{event_url}}`,
  camera_booking_open: `【📢本日予約受付が開始します】\n\n{{event_date}}📍{{title}}\n{{subtitle}}\nのイベント予約本日{{booking_open_time}}に開始されます！\n\nぜひ皆様のご予約お待ちしております🫧`,
  camera_friday_lineup: `おはようございます☀️\n金曜日、頑張りましょう！\n\n今週末のフォトフルの開催イベントは\n{{events_list}}`,
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
