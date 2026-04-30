import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { renderEmailTemplate } from '@/lib/email-render'

function formatDate(dateString) {
  if (!dateString) return "未取得";
  const d = new Date(dateString + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateString;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

function buildLocationBlock(event) {
  const isStreet = event?.event_type === 'street'
  const label = isStreet ? 'ストリート撮影' : 'スタジオ撮影'
  const place = isStreet
    ? (event?.meeting_place || event?.location_name || '未取得')
    : (event?.location_name || '未取得')
  const address = event?.meeting_address || ''
  const mapUrl = event?.meeting_map_url || ''

  return `
    <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
      <p style="margin:0 0 12px; font-size:16px; line-height:1.8;"><strong>開催形式：</strong>${label}</p>
      <p style="margin:0 0 12px; font-size:16px; line-height:1.8;"><strong>${isStreet ? '集合場所' : '開催場所'}：</strong>${place}</p>
      ${address ? `<p style="margin:0 0 12px; font-size:16px; line-height:1.8;"><strong>住所：</strong>${address}</p>` : ''}
      ${mapUrl ? `<p style="margin:0; font-size:15px; line-height:1.8;"><strong>地図：</strong><a href="${mapUrl}" style="color:#2563eb; text-decoration:underline;">Google Mapsで確認する</a></p>` : ''}
    </div>
  `
}

function buildRulesBlock(event) {
  const content = event?.street_notes
  if (!content) return ''
  return `
    <div style="border-top:1px solid #e5e5e5; padding-top:20px; margin-bottom:24px;">
      <p style="margin:0 0 10px; font-size:14px; font-weight:700; color:#2f2244;">伝達事項</p>
      <p style="margin:0; font-size:13px; color:#555; line-height:1.9; white-space:pre-line;">${content}</p>
    </div>
  `
}

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const body = await req.json();
    const { slot_id, customerName, email, qr_token, final_price, is_outdoor } = body;

    if (!slot_id || !customerName || !email) {
      return new Response(JSON.stringify({ error: "slot_id, customerName, email is required" }), { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data: slot } = await supabase.from("booking_slots").select("*").eq("id", slot_id).single();
    if (!slot) return new Response(JSON.stringify({ error: "booking_slots の取得に失敗しました" }), { status: 500 });

    const { data: entry } = await supabase.from("event_entries").select("*").eq("id", slot.event_entry_id).single();
    if (!entry) return new Response(JSON.stringify({ error: "event_entries の取得に失敗しました" }), { status: 500 });

    const [{ data: model }, { data: event }] = await Promise.all([
      supabase.from("models").select("*").eq("id", entry.model_id).single(),
      supabase.from("events").select("*").eq("id", entry.event_id).single(),
    ]);

    if (!event) return new Response(JSON.stringify({ error: "events の取得に失敗しました" }), { status: 500 });

    const modelName = model?.name || "未取得";
    const modelImage = model?.image || "";
    const eventDate = formatDate(event?.event_date);
    const slotLabel = slot?.slot_label || "未取得";
    const displayPrice = final_price ?? slot?.price ?? 0;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'
    const verifyUrl = qr_token ? `${baseUrl}/booking-verify?token=${qr_token}` : null
    const qrImageUrl = verifyUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`
      : null;

    const qrBlock = qrImageUrl
      ? `<div style="text-align:center;margin-bottom:24px;"><p style="font-size:14px;color:#555;margin:0 0 12px;">当日受付時にこのQRコードをご提示ください</p><img src="${qrImageUrl}" alt="受付QRコード" style="width:160px;height:160px;border:1px solid #e5e5e5;border-radius:8px;"/></div>`
      : ''

    const templateResult = await renderEmailTemplate(supabase, 'booking-confirmation', {
      customer_name: customerName,
      model_name: modelName,
      event_date: eventDate,
      slot_label: slotLabel,
      price: `¥${Number(displayPrice).toLocaleString()}${is_outdoor ? '（屋外撮影・スタジオ料金割引適用済み）' : ''}`,
      qr_block: qrBlock,
      location_block: buildLocationBlock(event),
      rules_block: buildRulesBlock(event),
    })

    const html = templateResult?.html ?? `
      <div style="margin:0; padding:0; background:#f5f5f7; font-family:Arial, sans-serif; color:#2f2244;">
        <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
          <div style="background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

            ${modelImage ? `<img src="${modelImage}" alt="${modelName}" style="display:block; width:100%; height:320px; object-fit:cover;"/>` : ''}

            <div style="padding:32px;">
              <p style="text-align:center; font-size:14px; color:#777; margin:0;">Model</p>
              <h2 style="text-align:center; margin:0 0 24px;">${modelName}</h2>
              <h1 style="margin:0 0 24px; font-size:28px; line-height:1.4;">ご予約ありがとうございます</h1>

              <p style="margin:0 0 24px; font-size:16px; line-height:1.9;">
                ${customerName} 様<br>
                この度はPhoto Fleurにご予約いただき、誠にありがとうございます。<br>
                以下の内容でご予約を受け付けました。
              </p>

              <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;"><strong>モデル名：</strong>${modelName}</p>
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;"><strong>開催日：</strong>${eventDate}</p>
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;"><strong>予約時間：</strong>${slotLabel}</p>
                <p style="margin:0; font-size:16px; line-height:1.8;"><strong>料金：</strong>¥${Number(displayPrice).toLocaleString()}${is_outdoor ? '（屋外撮影・スタジオ料金割引適用済み）' : ''}</p>
              </div>

              ${qrBlock}
              ${buildLocationBlock(event)}
              ${buildRulesBlock(event)}

              <div style="font-size:14px; color:#555; line-height:2; border-top:1px solid #f0f0f0; padding-top:20px;">
                <p style="margin:0 0 12px;">
                  ご不明点がございましたら、公式LINEよりご連絡ください。<br>
                  <a href="https://lin.ee/7XLB4St" style="color:#2563eb; text-decoration:underline;">https://lin.ee/7XLB4St</a>
                </p>
                <p style="margin:0;">モデルの体調不良などにより、こちらからキャンセルさせていただく可能性がございます。ご了承ください。</p>
              </div>

              <p style="margin:24px 0 0; font-size:13px; color:#aaa;">Photo Fleur運営（送信専用）</p>
            </div>
          </div>
        </div>
      </div>
    `

    const emailSubject = templateResult?.subject || "【Photo Fleur】ご予約確定のお知らせ"

    const data = await resend.emails.send({
      from: "Photo Fleur運営 <onboarding@resend.dev>",
      to: email,
      subject: emailSubject,
      html,
    });

    return Response.json({ success: true, data });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}
