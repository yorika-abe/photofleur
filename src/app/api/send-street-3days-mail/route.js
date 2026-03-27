import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

function getJstDateString(date = new Date()) {
  const jst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, "0");
  const day = String(jst.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateString(baseDateString, days) {
  const base = new Date(`${baseDateString}T00:00:00`);
  base.setDate(base.getDate() + days);
  return getJstDateString(base);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const forceDate = searchParams.get("date");

    // 🔐 セキュリティチェック
    if (secret !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const resend = new Resend(process.env.RESEND_API_KEY);

    // 📅 日付（3日前）
    const todayJst = getJstDateString();
    const targetDate = forceDate || addDaysToDateString(todayJst, 3);

    // 📍 ストリートイベント取得
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("event_type", "street")
      .eq("event_date", targetDate);

    if (!events || events.length === 0) {
      return Response.json({ message: "対象イベントなし" });
    }

    let sentCount = 0;

    for (const event of events) {
      // 🧩 予約取得
      const { data: reservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("event_id", event.id);

      if (!reservations) continue;

      for (const r of reservations) {
        await resend.emails.send({
          from: "Photo Fleur <onboarding@resend.dev>",
          to: r.email,
          subject: "【Photo Fleur】撮影3日前のご案内",
          html: `
            <div style="font-family:sans-serif;line-height:1.8;">
              <h2>📍集合場所のご案内</h2>

              <p>${r.name} 様</p>

              <p>
                撮影日が近づいてまいりました。<br/>
                ストリート撮影のため集合場所をご案内いたします。
              </p>

              <div style="margin:20px 0;padding:16px;border:1px solid #eee;border-radius:10px;">
                <p><b>📅 日程：</b>${event.event_date}</p>
                <p><b>📍 集合場所：</b>${event.location_name || "未設定"}</p>
                <p><b>🗺 地図：</b><br/>
                  <a href="${event.map_address}" target="_blank">
                    ${event.map_address}
                  </a>
                </p>
              </div>

              <p>
                当日は遅れのないようお願いいたします。<br/>
                お会いできるのを楽しみにしております✨
              </p>

              <hr/>

              <p style="font-size:12px;color:#777;">
                Photo Fleur運営
              </p>
            </div>
          `,
        });

        sentCount++;
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