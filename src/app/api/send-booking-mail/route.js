import { Resend } from "resend";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      customerName,
      modelName,
      modelImage,
      eventDate,
      eventType,
      locationName,
      address,
      meetingPlace,
      mapUrl,
      slotTime,
      paymentMethod,
      reservationId,
      qrToken,
      customMessage,
      termsUrl,
    } = body;

    const resend = new Resend(process.env.RESEND_API_KEY);

    const paymentLabel =
      paymentMethod === "square"
        ? "クレジットカード"
        : paymentMethod === "cash"
        ? "現金"
        : "未取得";

    const qrDisplayUrl = `https://photofleur.com/qr/${qrToken}`;

    const locationBlock =
      eventType === "street"
        ? `
          <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>開催形式：</strong>ストリート撮影
            </p>
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>開催エリア：</strong>${locationName || "未取得"}
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
              <strong>開催場所：</strong>${locationName || "未取得"}
            </p>
            <p style="margin:0 0 12px; font-size:16px; line-height:1.8;">
              <strong>住所：</strong>${address || "未取得"}
            </p>
            ${
              mapUrl
                ? `
              <p style="margin:0; font-size:16px; line-height:1.8; word-break:break-all;">
                <strong>MAP：</strong>
                <a href="${mapUrl}" style="color:#2563eb; text-decoration:underline;">${mapUrl}</a>
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
                alt="${modelName || "model"}"
                style="display:block; width:100%; height:360px; object-fit:cover;"
              />
            `
                : ""
            }

            <div style="padding:32px;">
              
              <p style="text-align:center; font-size:14px; color:#777; margin:0;">
                Model
              </p>
              <h2 style="text-align:center; margin:0 0 24px;">
                ${modelName || "未取得"}
              </h2>

              <h1 style="margin:0 0 24px; font-size:32px; line-height:1.4;">
                ご予約ありがとうございます
              </h1>

              <p style="margin:0 0 24px; font-size:16px; line-height:1.9;">
                ${customerName || "お客様"} 様<br>
                この度はご予約ありがとうございます。<br>
                以下の内容でご予約を受け付けました。
              </p>

              <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;">
                  <strong>モデル名：</strong>${modelName || "未取得"}
                </p>
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;">
                  <strong>開催日：</strong>${eventDate || "未取得"}
                </p>
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;">
                  <strong>予約時間：</strong>${slotTime || "未取得"}
                </p>
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;">
                  <strong>お支払い方法：</strong>${paymentLabel}
                </p>
                <p style="margin:0; font-size:16px; line-height:1.8; word-break:break-all;">
                  <strong>予約番号：</strong>${reservationId || "未取得"}
                </p>
              </div>

              ${locationBlock}

              <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; text-align:center;">
                <p style="margin:0 0 12px; font-size:24px; font-weight:700; color:#2f2244;">
                  受付用QRコード
                </p>
                <p style="margin:0 0 10px; font-size:16px; line-height:1.8;">
                  当日受付にてご提示ください。
                </p>

                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    qrDisplayUrl
                  )}"
                  alt="QRコード"
                  style="width:200px; height:200px; margin:16px auto; display:block;"
                />

                <p style="font-size:13px; color:#888; margin:0 0 12px;">
                  スクリーンショット保存をおすすめします
                </p>

                <p style="margin:0; font-size:14px; line-height:1.8; word-break:break-all;">
                  <a href="${qrDisplayUrl}" style="color:#2563eb; text-decoration:underline;">
                    ${qrDisplayUrl}
                  </a>
                </p>
              </div>

              ${
                customMessage
                  ? `
                <div style="margin-bottom:24px; font-size:16px; line-height:1.9; color:#2f2244;">
                  ${customMessage.replace(/\n/g, "<br>")}
                </div>
              `
                  : ""
              }

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
                  <a href="${termsUrl || "https://photofleur.com"}" style="color:#2563eb; text-decoration:underline;">
                    ${termsUrl || "https://photofleur.com"}
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
      to: "yorikarin1101@icloud.com",
      subject: "【Photo Fleur】ご予約確定のお知らせ（QRコード付き）",
      html,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}