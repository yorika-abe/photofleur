import { createSupabaseAdminClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'

export const DEFAULTS = {
  shift_open: `🗓️シフト提出が解放されました。\nモデル画面から確認して提出してください。\n締め切りは{{deadline}}までです！`,
  shift_deadline_reminder: `お疲れ様です🎀🫧\n📢シフト提出締め切り前日になりました。\n\n未提出者は連絡確認次第モデルポータルからシフト提出日お願いします🙇‍♂️\n🔗${SITE_URL}`,
  event_publish: `📢開催イベントが解放されました。\n\n📍{{event_date}} {{title}}\n予約受付開始日→{{booking_open_at}}~\n\n詳細は🔗{{event_url}}`,
  model_booking_notify: `【予約が入りました】\n撮影日：{{event_date}} 📍{{event_title}}\n時間枠：{{slot_label}}\nニックネーム：{{nickname}}\nSNS URL：{{sns_url}}`,
  event_product_booking_notify: `【指定あり】\n{{event_date}} {{product_name}}\n{{details}}ニックネーム：{{nickname}}\nSNS URL：{{sns_url}}`,
  event_product_day_before_section: `\n【👗指定】\n{{product_name}}\n{{bookings_list}}`,
  model_day_before: `お疲れ様です😊\n次回撮影会の詳細です！ご確認よろしくお願いします✨\n\n【📅集合日時】\n{{event_date}} {{assembly_time}}\n\n{{location_info}}\n【📸予約カメラマン】\n{{photographer_slots}}\n\n【⏰スケジュール】\n🔍 HPよりご確認ください。\n{{event_page_url}}\n\n🔸見方が分からない場合はご連絡ください💬\n🔸このラインにて集合時間は確定します。\n🔸集合時間以降のエントリー時間での予約は当日でも更新されます。\n\n{{model_lunch_note}}\n{{extra_sections}}`,
  camera_event_publish: `【イベント公開のお知らせ📸】\n\n{{event_date}}📍{{title}}\n{{subtitle}}\nのイベント詳細が公開されました！\n\n{{description}}\n\n予約受付開始は\n🗓️{{booking_open_at}}〜\n\nイベント詳細はリンクからご確認ください💖\n🔗{{event_url}}`,
  camera_booking_open: `【📢本日予約受付が開始します】\n\n{{event_date}}📍{{title}}\n{{subtitle}}\nのイベント予約本日{{booking_open_time}}に開始されます！\n\nぜひ皆様のご予約お待ちしております🫧`,
  camera_friday_lineup: `おはようございます☀️\n金曜日、頑張りましょう！\n\n今週末のフォトフルの開催イベントは\n{{events_list}}`,
  private_booking_notify: `【🔗非公開予約が入りました】\n撮影日：{{event_date}}\n集合場所：{{meeting_place}}\n撮影時間：{{shooting_time}}\nニックネーム：{{nickname}}\nSNS URL：{{sns_url}}`,
  private_day_before: `お疲れ様です😊\n明日の非公開予約の詳細です！ご確認よろしくお願いします✨\n撮影日：{{event_date}}\n集合場所：{{meeting_place}}\n撮影時間：{{shooting_time}}\nニックネーム：{{nickname}}\nSNS URL：{{sns_url}}`,
  monthly_events_model: `【今月のイベントのお知らせ】\nおはようございます☀️\n{{month}}月がスタートしましたね！\n\n今月の季節のイベントをお知らせします❤︎\n{{events_list}}\n\n今月も楽しくみんなが過ごせますように🙏`,
  monthly_events_camera: `【今月のイベントのお知らせ】\nおはようございます☀️\n{{month}}月がスタートしましたね！\n\n今月の季節のイベントをお知らせします❤︎\n{{events_list}}\n\n今月も楽しくみんなが過ごせますように🙏`,
  birthday_msg: `今日は○○ちゃんの誕生日！\nお誕生日おめでとうございます💖\n素敵な1日になりますように❣️\n\nPhotoFleur運営`,
  photographer_booking: `【PhotoFleur】ご予約ありがとうございます📸\n\n撮影日：{{event_date}}\n時間枠：{{slot_label}}\n担当モデル：{{model_name}}\n\n当日お気をつけてお越しください🌸\nご不明点は公式LINEよりご連絡ください。`,
  photographer_special: `【PhotoFleur】特別予約が完了しました📸\n\n商品：{{product_name}}\n撮影日：{{event_date}}\n{{selections}}\n\nご予約ありがとうございます🌸\nご不明点は公式LINEよりご連絡ください。`,
  photographer_private: `【PhotoFleur】非公開予約が完了しました📸\n\n商品：{{product_title}}\n担当モデル：{{model_name}}\n\n詳細は別途メールにてお送りしております🌸\nご不明点は公式LINEよりご連絡ください。`,
  photographer_goods: `【PhotoFleur】ご注文ありがとうございます🛍️\n\n商品：{{goods_title}}\n数量：{{quantity}}点\n\nご注文を受け付けました。\nご不明点は公式LINEよりご連絡ください。`,
  photographer_day_before: `【PhotoFleur】明日の撮影のご案内📸\n\n明日（{{event_date}}）は撮影会です！\n時間枠：{{slot_label}}\n担当モデル：{{model_name}}\n場所：{{location}}\n\nQRコードは予約完了メールに記載されています。\nどうぞよろしくお願いいたします🌸`,
  photographer_private_day_before: `【PhotoFleur】明日の撮影のご案内📸\n\n明日は以下の撮影が予定されています。\n\n商品：{{product_title}}\n集合場所：{{meeting_place}}\n撮影時間：{{shooting_time}}\n\nよろしくお願いいたします🌸`,
  staff_recruit_notice: `【🔵スタッフ募集のお知らせ】\n\n{{details}}\n\nスタッフ募集日から確認してください！\n※スタッフ決定は先着順です。\n※場所未定のリクエスト撮影に関してはスタッフ応募がない場合流れる可能性が高いです。\n※確定ラインにてスタッフ確定となります。\n※応募後はキャンセルできません。代役を立ててください。`,
  staff_confirmed_notice: `🔵スタッフ確定のお知らせ\n\n{{date}}\n\n【📍集合場所】\n{{location}}\n\n【⏰集合時間】\n{{assembly_time}}\n\n【🗓️撮影時間】\n{{shoot_time}}\n\n【👠撮影モデル】\n{{model_names}}\n\n【📸カメラマン】\n{{photographer_info}}\n\n※確定メール後のキャンセルはできません。\n※前日リマインドもしますが忘れないように気をつけてください。\n※撮影時間の前後に受付があるので撮影時刻の15分前までに必ず受付場所に行き到着し次第集合場所写真を送信してください。\n※万が一遅刻の可能性がある場合は必ずモデルと運営に連絡入れてください。\n※受付は受付マニュアル通り必ず行ってください。`,
  staff_model_notice: `【🟢受付スタッフが決定しました。】\n\n{{details}}\n\n対応スタッフ：{{staff_name}}\n\n※受付があるので集合時刻の10分前に集合場所へお越しください。`,
  staff_day_before: `🔵🔵スタッフ　前日リマインド\n\n{{date}}\n\n【📍集合場所】\n{{location}}\n\n【⏰集合時間】\n{{assembly_time}}\n\n【🗓️撮影時間】\n{{shoot_time}}\n\n【👠撮影モデル】\n{{model_names}}\n\n【📸カメラマン】\n{{photographer_info}}\n\n⚠️撮影時間の前後に受付があるので撮影時刻の15分前までに必ず受付場所に行き到着し次第集合場所写真を送信してください。\n※万が一遅刻の可能性がある場合は必ずモデルと運営に連絡入れてください。\n※受付は受付マニュアル通り必ず行ってください。`,
  staff_cancel_notice: `🔴スタッフ キャンセルのお知らせ\n\n{{details}}`,
  staff_model_cancel_notice: `【🔴受付スタッフがキャンセルされました】\n\n{{details}}\n\n対応スタッフ：{{staff_name}}`,
  staff_re_recruit_notice: `【🔴スタッフ再募集のお知らせ】\n\n{{details}}\n\nスタッフ募集日から確認してください！\n※スタッフ決定は先着順です。\n※場所未定のリクエスト撮影に関してはスタッフ応募がない場合流れる可能性が高いです。\n※確定ラインにてスタッフ確定となります。\n※応募後はキャンセルできません。代役を立ててください。`,
  staff_event_cancel_notice: `🔴スタッフ参加予定のイベントの開催見送りが決まりました。\n\n{{details}}`,
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
