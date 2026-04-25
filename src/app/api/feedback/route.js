import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const ADMIN_EMAIL = 'yorika.photo@gmail.com'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'content required' }, { status: 400 })

  const admin = await createSupabaseAdminClient()

  // Save to feedbacks table
  const { error } = await admin.from('feedbacks').insert({
    user_id: user.id,
    user_email: user.email,
    content: content.trim(),
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Notify admin
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Photo Fleur運営 <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: '【PhotoFleur】ご意見箱に新しい投稿があります',
      html: `<div style="font-family:sans-serif;padding:24px;">
        <h2 style="color:#1a3560;">📮 ご意見箱 新着</h2>
        <p><strong>送信者：</strong>${user.email}</p>
        <div style="background:#f5f5f7;border-radius:10px;padding:16px;margin-top:12px;font-size:14px;line-height:2;white-space:pre-wrap;">${content.trim()}</div>
        <p style="margin-top:16px;"><a href="https://photofleur.vercel.app/admin/feedback" style="color:#1a3560;">管理画面で確認する →</a></p>
      </div>`,
    })
  } catch (_) {}

  return Response.json({ ok: true })
}

export async function GET(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin.from('feedbacks').select('*').order('created_at', { ascending: false })
  return Response.json(data || [])
}
