import { Resend } from 'resend'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'
const TEST_TO = 'yorika.photo@gmail.com'
const TEST_QR = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${BASE_URL}/booking-verify?token=test-token-sample`)}`

export async function POST() {
  const resend = new Resend(process.env.RESEND_API_KEY)

  // ① 予約確定メール
  const bookingHtml = `
    <div style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#2f2244;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
          <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=640&h=320&fit=crop" alt="モデル" style="display:block;width:100%;height:320px;object-fit:cover;"/>
          <div style="padding:32px;">
            <p style="text-align:center;font-size:14px;color:#777;margin:0;">Model</p>
            <h2 style="text-align:center;margin:0 0 24px;">阿部 依花</h2>
            <h1 style="margin:0 0 24px;font-size:28px;line-height:1.4;">ご予約ありがとうございます</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.9;">
              山田 花子 様<br>この度はPhoto Fleurにご予約いただき、誠にありがとうございます。<br>以下の内容でご予約を受け付けました。
            </p>
            <div style="border:1px solid #e5e5e5;border-radius:16px;padding:20px;margin-bottom:24px;background:#fafafa;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.8;"><strong>モデル名：</strong>阿部 依花</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.8;"><strong>開催日：</strong>2026年5月1日（金）</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.8;"><strong>予約時間：</strong>1部 10:00〜11:00</p>
              <p style="margin:0;font-size:16px;line-height:1.8;"><strong>料金：</strong>¥10,000</p>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <p style="font-size:14px;color:#555;margin:0 0 12px;">当日受付時にこのQRコードをご提示ください</p>
              <img src="${TEST_QR}" alt="受付QRコード" style="width:160px;height:160px;border:1px solid #e5e5e5;border-radius:8px;"/>
            </div>
            <div style="border:1px solid #e5e5e5;border-radius:16px;padding:20px;margin-bottom:24px;background:#fafafa;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.8;"><strong>開催形式：</strong>スタジオ撮影</p>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.8;"><strong>開催場所：</strong>Studio gallery-o15&16</p>
              <p style="margin:0;font-size:16px;line-height:1.8;"><strong>住所：</strong>東京都渋谷区〇〇1-2-3</p>
            </div>
            <div style="font-size:14px;color:#555;line-height:2;">
              <p style="margin:0 0 12px;">確定メールを送信させていただきますのでご確認ください。</p>
              <p style="margin:0 0 12px;">ご不明点がございましたら、公式LINEよりご連絡ください。<br>
                <a href="https://lin.ee/7XLB4St" style="color:#2563eb;">https://lin.ee/7XLB4St</a>
              </p>
              <p style="margin:0;">モデルの体調不良などにより、こちらからキャンセルさせていただく可能性がございます。ご了承ください。</p>
            </div>
            <p style="margin:32px 0 0;font-size:14px;color:#777;">Photo Fleur運営</p>
          </div>
        </div>
      </div>
    </div>
  `

  // ② 前日リマインダーメール
  const reminderHtml = `
    <div style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#2f2244;">
      <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
        <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#2f2244,#4a3570);padding:28px 32px;color:#fff;">
            <p style="margin:0 0 4px;font-size:12px;opacity:0.7;letter-spacing:0.1em;">REMINDER</p>
            <h1 style="margin:0;font-size:24px;font-weight:700;">明日の撮影会のご案内</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="font-size:15px;line-height:1.9;margin:0 0 24px;">
              山田 花子 様<br>明日はご予約いただいている撮影日です。<br>以下の内容をご確認のうえ、当日お気をつけてお越しください。
            </p>
            <div style="background:#f8f5ff;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;line-height:2;color:#555;">
                <strong style="color:#2f2244;">モデル</strong>　阿部 依花<br>
                <strong style="color:#2f2244;">開催日</strong>　2026年5月1日（金）<br>
                <strong style="color:#2f2244;">予約枠</strong>　1部 10:00〜11:00<br>
                <strong style="color:#2f2244;">料金</strong>　¥10,000
              </p>
            </div>
            <div style="border:1px solid #e5e5e5;border-radius:14px;padding:20px;margin-bottom:20px;background:#fafafa;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#2f2244;">📍 集合場所・アクセス</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.8;">Studio gallery-o15&16</p>
              <p style="margin:0;font-size:14px;color:#555;">東京都渋谷区〇〇1-2-3</p>
            </div>
            <div style="text-align:center;margin-bottom:24px;padding:20px;border:1px solid #e0d5f5;border-radius:12px;">
              <p style="margin:0 0 12px;font-size:13px;color:#888;">受付時にこちらのQRコードをご提示ください</p>
              <img src="${TEST_QR}" alt="受付QRコード" style="width:150px;height:150px;border-radius:8px;"/>
            </div>
            <div style="font-size:13px;color:#777;line-height:2;border-top:1px solid #f0f0f0;padding-top:20px;">
              <p style="margin:0 0 8px;">ご不明点は公式LINEよりご連絡ください：<br>
                <a href="https://lin.ee/7XLB4St" style="color:#2563eb;">https://lin.ee/7XLB4St</a>
              </p>
              <p style="margin:0;">モデルの体調不良等によりキャンセルとなる場合がございます。ご了承ください。</p>
            </div>
            <p style="margin:24px 0 0;font-size:13px;color:#aaa;">Photo Fleur運営</p>
          </div>
        </div>
      </div>
    </div>
  `

  // ③ ストリート集合場所案内メール（3日前）
  const streetHtml = `
    <div style="font-family:sans-serif;line-height:1.8;max-width:600px;margin:0 auto;padding:32px 16px;">
      <h2>📍集合場所のご案内</h2>
      <p>山田 花子 様</p>
      <p>撮影日が近づいてまいりました。<br/>ストリート撮影のため集合場所をご案内いたします。</p>
      <div style="margin:20px 0;padding:16px;border:1px solid #eee;border-radius:10px;">
        <p><b>📅 日程：</b>2026年5月1日（金）</p>
        <p><b>📍 集合場所：</b>渋谷スクランブル交差点 ハチ公前</p>
        <p><b>🗺 地図：</b><br/>
          <a href="https://maps.google.com" target="_blank">Google Mapsで確認</a>
        </p>
      </div>
      <p>当日は遅れのないようお願いいたします。<br/>お会いできるのを楽しみにしております✨</p>
      <hr/>
      <p style="font-size:12px;color:#777;">Photo Fleur運営</p>
    </div>
  `

  const results = await Promise.allSettled([
    resend.emails.send({ from: 'Photo Fleur運営 <onboarding@resend.dev>', to: TEST_TO, subject: '【テスト①】予約確定メール', html: bookingHtml }),
    resend.emails.send({ from: 'Photo Fleur運営 <onboarding@resend.dev>', to: TEST_TO, subject: '【テスト②】前日リマインダーメール', html: reminderHtml }),
    resend.emails.send({ from: 'Photo Fleur運営 <onboarding@resend.dev>', to: TEST_TO, subject: '【テスト③】ストリート3日前集合場所案内', html: streetHtml }),
  ])

  return Response.json({ ok: true, results: results.map(r => r.status) })
}
