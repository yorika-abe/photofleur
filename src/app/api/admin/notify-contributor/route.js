import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { sendLineCameraUser } from '@/lib/line'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin') ? admin : null
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://photofleur.jp'

const EMAIL_SUBJECT = '【📢お知らせ】お写真がホームページに掲載されました'

function buildEmailHtml() {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7fbfd;font-family:sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07)">
    <div style="background:#5bbfd6;padding:28px 32px;text-align:center">
      <p style="color:#fff;font-size:22px;font-weight:700;margin:0">Photo Fleur</p>
    </div>
    <div style="padding:32px">
      <p style="font-size:15px;color:#333;line-height:1.8">
        いつもPhoto Fleurをご利用いただきありがとうございます。<br><br>
        ご提供いただきました写真がホームページに掲載されました。<br>
        ぜひご確認ください📸
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${SITE_URL}" style="display:inline-block;background:#5bbfd6;color:#fff;text-decoration:none;padding:14px 36px;border-radius:30px;font-size:15px;font-weight:700">
          ホームページを見る →
        </a>
      </div>
      <p style="font-size:13px;color:#999;border-top:1px solid #eee;padding-top:20px;margin-top:20px">
        Photo Fleur 運営
      </p>
    </div>
  </div>
</body>
</html>`
}

const LINE_MESSAGE = `【📢お知らせ】

いつもPhoto Fleurをご利用いただきありがとうございます。

ご提供いただきました写真がホームページに掲載されました。
ぜひご確認ください📸

${SITE_URL}

Photo Fleur 運営`

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { photo_id } = await req.json()
  if (!photo_id) return Response.json({ error: 'photo_id required' }, { status: 400 })

  const { data: photo } = await admin
    .from('contributed_photos')
    .select('user_email')
    .eq('id', photo_id)
    .single()

  if (!photo?.user_email) return Response.json({ error: 'photo not found' }, { status: 404 })

  const email = photo.user_email
  let emailSent = false
  let lineSent = false
  let lineError = null

  // メール送信
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: email,
      subject: EMAIL_SUBJECT,
      html: buildEmailHtml(),
    })
    emailSent = !error
  } catch {}

  // LINE送信（user_profiles から line_user_id を取得）
  try {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const user = (users || []).find(u => u.email === email)
    if (user?.id) {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('line_user_id')
        .eq('id', user.id)
        .single()
      if (profile?.line_user_id) {
        const result = await sendLineCameraUser(profile.line_user_id, LINE_MESSAGE)
        lineSent = result.ok
        if (!result.ok) lineError = result.reason
      } else {
        lineError = 'LINE未連携'
      }
    } else {
      lineError = 'ユーザーが見つかりません'
    }
  } catch (e) {
    lineError = String(e)
  }

  return Response.json({ ok: true, emailSent, lineSent, lineError })
}
