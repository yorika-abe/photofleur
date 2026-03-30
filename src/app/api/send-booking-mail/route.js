import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

function formatDate(dateString) {
  if (!dateString) return "未取得";

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = weekdays[d.getDay()];

  return `${y}年${m}月${day}日（${w}）`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { slot_id, customerName, email } = body;

    if (!slot_id || !customerName || !email) {
      return new Response(
        JSON.stringify({ error: "slot_id, customerName, email is required" }),
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // ① booking_slots取得
    const { data: slot, error: slotError } = await supabase
      .from("booking_slots")
      .select("*")
      .eq("id", slot_id)
      .single();

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({
          error: "booking_slots の取得に失敗しました",
          detail: slotError,
        }),
        { status: 500 }
      );
    }

    // ② event_entries取得
    const { data: entry, error: entryError } = await supabase
      .from("event_entries")
      .select("*")
      .eq("id", slot.event_entry_id)
      .single();

    if (entryError || !entry) {
      return new Response(
        JSON.stringify({
          error: "event_entries の取得に失敗しました",
          detail: entryError,
        }),
        { status: 500 }
      );
    }

    // ③ models取得
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("*")
      .eq("id", entry.model_id)
      .single();

    if (modelError || !model) {
      return new Response(
        JSON.stringify({
          error: "models の取得に失敗しました",
          detail: modelError,
        }),
        { status: 500 }
      );
    }

    // ④ events取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", entry.event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({
          error: "events の取得に失敗しました",
          detail: eventError,
        }),
        { status: 500 }
      );
    }

    const modelName = model?.name || "未取得";
    const modelImage = model?.image || "";
    const eventDate = formatDate(event?.event_date);
    const slotLabel = slot?.slot_label || "未取得";
    const price = slot?.price ?? "未取得";

    const locationBlock =
      event?.event_type === "street"
        ? `
          <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>開催形式：</strong>ストリート撮影
            </p>
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>開催エリア：</strong>${event?.location_name || "未取得"}
            </p>
            <p style="margin:0; font-size:14px; line-height:1.9; color:#555;">
              集合場所の詳細は開催日の3日前にメールにてご案内いたします。
            </p>
          </div>
        `
        : `
          <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>開催形式：</strong>スタジオ撮影
            </p>
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>開催場所：</strong>${event?.location_name || "未取得"}
            </p>
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>住所：</strong>${event?.address || "未取得"}
            </p>
            ${
              event?.map_address
                ? `
              <p style="margin:0; font-size:16px; line-height:1.8; word-break:break-all;">
                <strong>MAP：</strong>
                <a href="${event.map_address}" style="color:#2563eb; text-decoration:underline;">
                  ${event.map_address}
                </a>
              </p>
            `
                : ""
            }
          </div>
        `;

    const html = `
      <div style="margin:0; padding:0; background:#f5f5f7; font-family:Arial, sans-serif; color:#2f2244;">
        <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
          <div style="background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

            ${
              modelImage
                ? `
              <img
                src="${modelImage}"
                alt="${modelName}"
                style="display:block; width:100%; height:320px; object-fit:cover;"
              />
            `
                : ""
            }

            <div style="padding:32px;">
              <p style="text-align:center; font-size:14px; color:#777; margin:0;">
                Model
              </p>

              <h2 style="text-align:center; margin:0 0 24px;">
                ${modelName}
              </h2>

              <h1 style="margin:0 0 24px; font-size:32px; line-height:1.4;">
                ご予約ありがとうございます
              </h1>

              <p style="margin:0 0 24px; font-size:16px; line-height:1.9;">
                ${customerName} 様<br>
                この度は Photo Fleur にご予約いただき、誠にありがとうございます。<br>
                以下の内容でご予約を受け付けました。
              </p>

              <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;">
                  <strong>モデル名：</strong>${modelName}
                </p>
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;">
                  <strong>開催日：</strong>${eventDate}
                </p>
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;">
                  <strong>予約時間：</strong>${slotLabel}
                </p>
                <p style="margin:0; font-size:16px; line-height:1.8;">
                  <strong>料金：</strong>¥${price}
                </p>
              </div>

              ${locationBlock}

              <div style="font-size:14px; color:#555; line-height:2;">
                <p style="margin:0 0 12px;">
                  開催場所や当日の詳細につきましては、開催日前日までにご案内いたします。
                </p>

                <p style="margin:0 0 12px;">
                  ご不明点がございましたら、公式LINEよりご連絡ください。<br>
                  <a href="https://lin.ee/7XLB4St" style="color:#2563eb; text-decoration:underline;">
                    https://lin.ee/7XLB4St
                  </a>
                </p>

                <p style="margin:0 0 12px;">
                  モデルの体調不良などにより、こちらからキャンセルさせていただく可能性がございます。ご了承ください。
                </p>

                <p style="margin:0;">
                  ご利用規約もあわせてご確認ください。<br>
                  <a href="https://photofleur.com" style="color:#2563eb; text-decoration:underline;">
                    https://photofleur.com
                  </a>
                </p>
              </div>

              <p style="margin:32px 0 0; font-size:14px; color:#777;">
                Photo Fleur運営
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: "Photo Fleur運営 <onboarding@resend.dev>",
      to: email,
      subject: "【Photo Fleur】ご予約確定のお知らせ",
      html,
    });

    return Response.json({ success: true, data });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500 }
    );
  }
}