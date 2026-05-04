import { Resend } from 'resend'

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export async function POST(req) {
  try {
    const { customerName, email, qr_token, productTitle, eventDate, timeLabel, price, modelName } = await req.json()
    if (!email || !customerName) {
      return Response.json({ error: 'email and customerName required' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''
    const verifyUrl = qr_token ? `${baseUrl}/booking-verify?token=${qr_token}` : null
    const qrImageUrl = verifyUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`
      : null

    const formattedDate = formatDate(eventDate)
    const dateBlock = formattedDate
      ? `<p style="margin:0 0 14px; font-size:16px; line-height:1.8;"><strong>開催日：</strong>${formattedDate}${timeLabel ? ` ${timeLabel}` : ''}</p>`
      : ''

    const html = `
      <div style="margin:0; padding:0; background:#f5f5f7; font-family:Arial, sans-serif; color:#2f2244;">
        <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
          <div style="background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
            <div style="padding:32px;">
              <h1 style="margin:0 0 24px; font-size:26px; line-height:1.4; color:#2f2244;">ご予約ありがとうございます</h1>

              <p style="margin:0 0 24px; font-size:16px; line-height:1.9; color:#333;">
                ${customerName} 様<br><br>
                この度はPhotoFleurにお申し込みいただき、誠にありがとうございます。<br>
                以下の内容でご予約を受け付けました。
              </p>

              <div style="border:1px solid #e5e5e5; border-radius:16px; padding:20px; margin-bottom:24px; background:#fafafa;">
                ${modelName ? `<p style="margin:0 0 14px; font-size:16px; line-height:1.8;"><strong>担当モデル：</strong>${modelName}</p>` : ''}
                <p style="margin:0 0 14px; font-size:16px; line-height:1.8;"><strong>商品名：</strong>${productTitle}</p>
                ${dateBlock}
                <p style="margin:0; font-size:16px; line-height:1.8;"><strong>料金：</strong>¥${Number(price).toLocaleString()}</p>
              </div>

              ${qrImageUrl ? `
              <div style="text-align:center; margin-bottom:24px;">
                <p style="font-size:14px; color:#555; margin:0 0 12px;">当日受付時にこのQRコードをご提示ください</p>
                <img src="${qrImageUrl}" alt="受付QRコード" style="width:160px; height:160px; border:1px solid #e5e5e5; border-radius:8px;" />
              </div>
              ` : ''}

              <div style="font-size:14px; color:#555; line-height:2; border-top:1px solid #f0f0f0; padding-top:20px;">
                <p style="margin:0 0 12px;">
                  ご不明点がございましたら、公式LINEよりご連絡ください。<br>
                  <a href="https://lin.ee/7XLB4St" style="color:#2563eb; text-decoration:underline;">https://lin.ee/7XLB4St</a>
                </p>
              </div>

              <p style="margin:24px 0 0; font-size:13px; color:#aaa;">PhotoFleur運営（送信専用）</p>
            </div>
          </div>
        </div>
      </div>
    `

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: email,
      subject: '【PhotoFleur】ご予約確定のお知らせ',
      html,
    })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
