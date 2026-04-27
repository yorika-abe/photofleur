import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

export async function GET() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin
    .from('bookings')
    .select('customer_email')
    .eq('marketing_consent', true)

  const emails = [...new Set((data || []).map(b => b.customer_email).filter(Boolean))]
  return Response.json({ count: emails.length, emails })
}

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, body } = await req.json()
  if (!subject?.trim() || !body?.trim()) return Response.json({ error: 'subject and body required' }, { status: 400 })

  const { data } = await admin
    .from('bookings')
    .select('customer_email')
    .eq('marketing_consent', true)

  const emails = [...new Set((data || []).map(b => b.customer_email).filter(Boolean))]
  if (emails.length === 0) return Response.json({ error: '送信先がいません' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)

  const htmlBody = body
    .split('\n')
    .map(line => line === '' ? '<br>' : `<p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#333;">${line}</p>`)
    .join('')

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#1a3560;padding:28px 32px;text-align:center;">
        <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.05em;">PhotoFleur</span>
      </div>
      <div style="padding:32px;">
        ${htmlBody}
      </div>
      <div style="background:#f5f5f5;padding:20px 32px;font-size:12px;color:#888;text-align:center;">
        PhotoFleur | このメールは撮影会予約時にメルマガを希望されたお客様にお送りしています。
      </div>
    </div>
  `

  let sent = 0
  let failed = 0
  for (const email of emails) {
    const { error } = await resend.emails.send({
      from: 'PhotoFleur <noreply@photofleur.jp>',
      to: email,
      subject,
      html,
    })
    if (error) failed++
    else sent++
  }

  return Response.json({ ok: true, sent, failed, total: emails.length })
}
