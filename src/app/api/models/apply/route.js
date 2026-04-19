import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  const body = await request.json()
  const { name, name_en, email, phone, height, birthday, bio, experience, instagram_url, twitter_url } = body

  if (!name || !email) {
    return Response.json({ error: 'お名前とメールアドレスは必須です。' }, { status: 400 })
  }

  const { error } = await supabase.from('model_applications').insert({
    name,
    name_en: name_en || null,
    email,
    phone: phone || null,
    height: height ? parseInt(height) : null,
    birthday: birthday || null,
    bio: bio || null,
    experience: experience || null,
    instagram_url: instagram_url || null,
    twitter_url: twitter_url || null,
    status: 'pending',
  })

  if (error) {
    console.error('model application insert error:', error)
    return Response.json({ error: 'データの保存に失敗しました。' }, { status: 500 })
  }

  // Notify admin
  await resend.emails.send({
    from: 'PhotoFleur <noreply@photofleur.jp>',
    to: 'yorika.photo@gmail.com',
    subject: '【PhotoFleur】新しいモデル応募がありました',
    html: `
      <h2>新しいモデル応募</h2>
      <p><strong>お名前：</strong>${name}</p>
      <p><strong>メール：</strong>${email}</p>
      <p><strong>身長：</strong>${height || '未記入'}cm</p>
      <p><strong>自己紹介：</strong>${bio || '未記入'}</p>
      <p><strong>Instagram：</strong>${instagram_url || '未記入'}</p>
      <p>管理画面から審査を行ってください。</p>
    `,
  }).catch(() => {})

  // Notify applicant
  await resend.emails.send({
    from: 'PhotoFleur <noreply@photofleur.jp>',
    to: email,
    subject: '【PhotoFleur】モデルご応募を受け付けました',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
        <h2 style="color:#2f2244;">${name} 様</h2>
        <p>PhotoFleurへのモデルご応募、誠にありがとうございます。</p>
        <p>ご応募内容を確認後、3〜5営業日以内に結果をご連絡いたします。</p>
        <p>ご不明な点はLINEまたはこのメールへの返信にてお問い合わせください。</p>
        <br>
        <p style="color:#999;font-size:13px;">PhotoFleur 運営チーム</p>
      </div>
    `,
  }).catch(() => {})

  return Response.json({ success: true })
}
