import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

function getJstDate(date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function formatDateToYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatJstDateLabel(ymd) {
  if (!ymd) return "未取得";
  const date = new Date(`${ymd}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${y}/${m}/${d}(${w})`;
}

function formatJstTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getReceptionTime(startTime) {
  if (!startTime) return "予約時間の15分前";
  const date = new Date(startTime);
  date.setMinutes(date.getMinutes() - 15);
  return formatJstTime(date.toISOString());
}

function paymentLabel(paymentMethod) {
  if (paymentMethod === "square") return "クレジットカード";
  if (paymentMethod === "cash") return "現金";
  return "未取得";
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const forceDate = searchParams.get("date"); 
    // 例: ?date=2026-04-05 で手動テスト

    if (secret !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const resend = new Resend(process.env.RESEND_API_KEY);

    const todayJst = getJstDate();
    const tomorrow = formatDateToYmd(addDays(todayJst, 1));
    const targetDate = forceDate || tomorrow;

    // 1. 明日開催のイベント取得
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("event_date", targetDate);

    if (eventsError) {
      return Response.json(
        { success: false, error: eventsError.message },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return Response.json({
        success: true,
        targetDate,
        sent: 0,
        message: "対象イベントなし",
      });
    }

    let sentCount = 0;

    for (const event of events) {
      // 2. event_entries
      const { data: entries, error: entriesError } = await supabase
        .from("event_entries")
        .select("*")
        .eq("event_id", event.id);

      if (entriesError || !entries || entries.length === 0) continue;

      for (const entry of entries) {
        // 3. model
        const { data: model } = await supabase
          .from("models")
          .select("*")
          .eq("id", entry.model_id)
          .single();

        // 4. booking_slots
        const { data: slots, error: slotsError } = await supabase
          .from("booking_slots")
          .select("*")
          .eq("event_entry_id", entry.id);

        if (slotsError || !slots || slots.length === 0) continue;

        for (const slot of slots) {
          // 5. reservations
          const { data: reservations, error: reservationsError } = await supabase
            .from("reservations")
            .select("*")
            .eq("booking_slot_id", slot.id);

          if (reservationsError || !reservations || reservations.length === 0) continue;

          for (const reservation of reservations) {
            if (!reservation.email) continue;

            const qrUrl = `https://photofleur.com/qr/${reservation.qr_token}`;
            const eventDateLabel = formatJstDateLabel(event.event_date);
            const receptionTime = getReceptionTime(slot.start_time);
            const modelImage = model?.image
              ? `${model.image}${model.image.includes("?") ? "&w=800" : "?w=800"}`
              : "";

            const placeBlock =
              event.event_type === "street"
                ? `
                  <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>開催形式：</strong>ストリート撮影
                    </p>
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>受付開始時間：</strong>${receptionTime}
                    </p>
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>集合場所：</strong>${event.meeting_place || "未取得"}
                    </p>
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>住所：</strong>${event.meeting_address || "未取得"}
                    </p>
                    ${
                      event.meeting_map_url
                        ? `
                      <p style="margin:0; font-size:16px; line-height:1.8; word-break:break-all;">
                        <strong>Google MAP：</strong>
                        <a href="${event.meeting_map_url}" style="color:#2563eb; text-decoration:underline;">
                          ${event.meeting_map_url}
                        </a>
                      </p>
                    `
                        : ""
                    }
                  </div>
                `
                : `
                  <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>開催形式：</strong>スタジオ撮影
                    </p>
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>受付開始時間：</strong>${receptionTime}
                    </p>
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>開催場所：</strong>${event.location_name || "未取得"}
                    </p>
                    <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                      <strong>住所：</strong>${event.address || "未取得"}
                    </p>
                    ${
                      event.map_address
                        ? `
                      <p style="margin:0; font-size:16px; line-height:1.8; word-break:break-all;">
                        <strong>Google MAP：</strong>
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
                        alt="${model?.name || "model"}"
                        style="display:block; width:100%; height:320px; object-fit:cover;"
                      />
                    `
                        : ""
                    }

                    <div style="padding:32px;">
                      <h1 style="margin:0 0 24px; font-size:30px; line-height:1.4;">
                        明日のご案内
                      </h1>

                      <p style="margin:0 0 24px; font-size:16px; line-height:1.9;">
                        ${reservation.customer_name || "お客様"} 様<br>
                        ご予約いただいている撮影会が明日開催となります。<br>
                        以下の内容をご確認ください。
                      </p>

                      <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
                        <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                          <strong>モデル名：</strong>${model?.name || "未取得"}
                        </p>
                        <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                          <strong>開催日：</strong>${eventDateLabel}
                        </p>
                        <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                          <strong>予約時間：</strong>${slot.slot_label || "未取得"}
                        </p>
                        <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
                          <strong>お支払い方法：</strong>${paymentLabel(reservation.payment_method)}
                        </p>
                        <p style="margin:0; font-size:16px; line-height:1.8; word-break:break-all;">
                          <strong>予約番号：</strong>${reservation.qr_token || "未取得"}
                        </p>
                      </div>

                      ${placeBlock}

                      <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; text-align:center;">
                        <p style="margin:0 0 12px; font-size:24px; font-weight:700; color:#2f2244;">
                          受付用QRコード
                        </p>
                        <p style="margin:0 0 10px; font-size:16px; line-height:1.8;">
                          当日受付にてご提示ください。
                        </p>

                        <img
                          src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            qrUrl
                          )}"
                          alt="QRコード"
                          style="width:200px; height:200px; margin:16px auto; display:block;"
                        />

                        <p style="font-size:13px; color:#888; margin:0 0 12px;">
                          スクリーンショット保存をおすすめします
                        </p>

                        <p style="margin:0; font-size:14px; line-height:1.8; word-break:break-all;">
                          <a href="${qrUrl}" style="color:#2563eb; text-decoration:underline;">
                            ${qrUrl}
                          </a>
                        </p>
                      </div>

                      <div style="font-size:14px; color:#555; line-height:2;">
                        <p style="margin:0 0 12px;">
                          ・このメールは送信専用です。返信は公式LINEよりお願いいたします。<br>
                          <a href="https://lin.ee/7XLB4St" style="color:#2563eb; text-decoration:underline;">
                            https://lin.ee/7XLB4St
                          </a>
                        </p>

                        <p style="margin:0 0 12px;">
                          ・モデルの体調不良などにより、こちらからキャンセルさせていただく可能性がございます。ご了承ください。
                        </p>

                        <p style="margin:0 0 12px;">
                          ・確定後のキャンセルにはキャンセル料がかかります。
                        </p>

                        <p style="margin:0;">
                          ・ご利用規約を再度ご確認ください。<br>
                          <a href="${event.terms_url || "https://photofleur.com"}" style="color:#2563eb; text-decoration:underline;">
                            ${event.terms_url || "https://photofleur.com"}
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

            await resend.emails.send({
              from: "Photo Fleur運営 <onboarding@resend.dev>",
              to: reservation.email,
              subject: `【Photo Fleur】明日のご案内（${eventDateLabel}）`,
              html,
            });

            sentCount += 1;
          }
        }
      }
    }

    return Response.json({
      success: true,
      targetDate,
      sent: sentCount,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}