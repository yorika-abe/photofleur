import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { slot_id, name, email } = await req.json();

    if (!slot_id || !name || !email) {
      return new Response(
        JSON.stringify({ error: "slot_id, name, email is required" }),
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data: slot, error: slotError } = await supabase
      .from("booking_slots")
      .select("*")
      .eq("id", slot_id)
      .single();

    if (slotError) {
      return new Response(JSON.stringify(slotError), { status: 500 });
    }

    const slotLabel = slot?.slot_label || "未取得";
    const price = slot?.price ?? "未取得";

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "【Photo Fleur】ご予約ありがとうございます",
      html: `
        <div style="font-family: sans-serif; line-height: 1.8; color: #222;">
          <h2 style="margin-bottom: 16px;">ご予約ありがとうございます</h2>

          <p>${name} 様</p>

          <p>
            このたびは Photo Fleur にご予約いただき、誠にありがとうございます。<br />
            以下の内容でご予約を受け付けました。
          </p>

          <div style="margin: 24px 0; padding: 16px; border: 1px solid #ddd; border-radius: 12px; background: #fafafa;">
            <p style="margin: 0 0 8px;"><strong>予約枠：</strong>${slotLabel}</p>
            <p style="margin: 0;"><strong>料金：</strong>¥${price}</p>
          </div>

          <p>
            開催場所や当日の詳細につきましては、開催日前日までにご案内いたします。<br />
            ご不明点がございましたら、お気軽にご連絡ください。
          </p>

          <p style="margin-top: 24px;">
            今後とも Photo Fleur をよろしくお願いいたします。
          </p>
        </div>
      `,
    });

    return Response.json({ success: true, data });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "unknown error" }),
      { status: 500 }
    );
  }
}