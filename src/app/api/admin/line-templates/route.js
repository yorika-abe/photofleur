import { createSupabaseAdminClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'

export const DEFAULTS = {
  shift_open: `🗓️シフト提出が解放されました。\nモデル画面から確認して提出してください。\n締め切りは{{deadline}}までです！`,
  shift_deadline_reminder: `お疲れ様です🎀🫧\n📢シフト提出締め切り前日になりました。\n\n未提出者は連絡確認次第モデルポータルからシフト提出日お願いします🙇‍♂️\n🔗${SITE_URL}`,
  event_publish: `📢開催イベントが解放されました。\n\n📍{{event_date}} {{title}}\n予約受付開始日→{{booking_open_at}}~\n\n詳細は🔗{{event_url}}`,
  model_booking_notify: `【予約が入りました】\n撮影日：{{event_date}} 📍{{event_title}}\n時間枠：{{slot_label}}\nニックネーム：{{nickname}}\nSNS URL：{{sns_url}}`,
  model_day_before: `お疲れ様です😊\n次回撮影会の詳細です！ご確認よろしくお願いします✨\n\n【📅集合日時】\n{{event_date}} {{assembly_time}}\n\n{{location_info}}\n【📸予約カメラマン】\n{{photographer_slots}}\n\n【⏰スケジュール】\n🔍 HPよりご確認ください。\n{{event_page_url}}\n\n🔸見方が分からない場合はご連絡ください💬\n🔸このラインにて集合時間は確定します。\n🔸集合時間以降のエントリー時間での予約は当日でも更新されます。\n\n{{model_lunch_note}}\n{{extra_sections}}`,
  camera_event_publish: `【イベント公開のお知らせ📸】\n\n{{event_date}}📍{{title}}\n{{subtitle}}\nのイベント詳細が公開されました！\n\n{{description}}\n\n予約受付開始は\n🗓️{{booking_open_at}}〜\n\nイベント詳細はリンクからご確認ください💖\n🔗{{event_url}}`,
  camera_booking_open: `【📢本日予約受付が開始します】\n\n{{event_date}}📍{{title}}\n{{subtitle}}\nのイベント予約本日{{booking_open_time}}に開始されます！\n\nぜひ皆様のご予約お待ちしております🫧`,
  camera_friday_lineup: `おはようございます☀️\n金曜日、頑張りましょう！\n\n今週末のフォトフルの開催イベントは\n{{events_list}}`,
  private_booking_notify: `【🔗非公開予約が入りました】\n撮影日：{{event_date}}\n集合場所：{{meeting_place}}\n撮影時間：{{shooting_time}}\nニックネーム：{{nickname}}\nSNS URL：{{sns_url}}`,
  private_day_before: `お疲れ様です😊\n明日の非公開予約の詳細です！ご確認よろしくお願いします✨\n撮影日：{{event_date}}\n集合場所：{{meeting_place}}\n撮影時間：{{shooting_time}}\nニックネーム：{{nickname}}\nSNS URL：{{sns_url}}`,
  monthly_events_model: `【今月のイベントのお知らせ】\nおはようございます☀️\n{{month}}月がスタートしましたね！\n\n今月の季節のイベントをお知らせします❤︎\n{{events_list}}\n\n今月も楽しくみんなが過ごせますように🙏`,
  monthly_events_camera: `【今月のイベントのお知らせ】\nおはようございます☀️\n{{month}}月がスタートしましたね！\n\n今月の季節のイベントをお知らせします❤︎\n{{events_list}}\n\n今月も楽しくみんなが過ごせますように🙏`,
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
