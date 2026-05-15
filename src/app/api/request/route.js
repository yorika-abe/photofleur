import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  const body = await request.json()
  const { name, email, phone, preferred_date, preferred_time, location_preference, model_preference, description, budget } = body

  if (!name || !email || !description) {
    return Response.json({ error: '必須項目を入力してください。' }, { status: 400 })
  }

  const { error } = await supabase.from('shoot_requests').insert({
    name,
    email,
    phone: phone || null,
    preferred_date: preferred_date || null,
    preferred_time: preferred_time || null,
    location_preference: location_preference || null,
    model_preference: model_preference || null,
    description,
    budget: budget || null,
    status: 'pending',
  })

  if (error) {
    console.error('shoot request insert error:', error)
    return Response.json({ error: 'データの保存に失敗しました。' }, { status: 500 })
  }

  // Notify admin
  await resend.emails.send({
    from: 'PhotoFleur <noreply@photofleur.jp>',
    to: process.env.ADMIN_EMAIL || 'yorikarin1101@icloud.com',
    subject: '【PhotoFleur】リクエスト撮影の問い合わせがありました',
    html: `
      <h2>新しいリクエスト撮影</h2>
      <p><strong>お名前：</strong>${name}</p>
      <p><strong>メール：</strong>${email}</p>
      <p><strong>希望日：</strong>${preferred_date || '未指定'}</p>
      <p><strong>希望場所：</strong>${location_preference || '未記入'}</p>
      <p><strong>ご要望：</strong>${description}</p>
      <p>管理画面から対応してください。</p>
    `,
  }).catch(() => {})

  // Notify requester
  await resend.emails.send({
    from: 'PhotoFleur <noreply@photofleur.jp>',
    to: email,
    subject: '【PhotoFleur】リクエスト撮影を受け付けました',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
        <h2 style="color:#2f2244;">${name} 様</h2>
        <p>リクエスト撮影のお問い合わせ、誠にありがとうございます。</p>
        <p>内容を確認後、3営業日以内に担当者よりご連絡いたします。</p>
        <p>ご不明な点はLINEまたはこのメールへの返信にてお問い合わせください。</p>
        <br>
        <p style="color:#999;font-size:13px;">PhotoFleur 運営チーム</p>
      </div>
    `,
  }).catch(() => {})

  return Response.json({ success: true })
}
