import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { event_id } = await req.json()
  if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 })

  // Fetch entries → slots → bookings
  const { data: entries } = await admin.from('event_entries').select('id').eq('event_id', event_id)
  const entryIds = (entries || []).map(e => e.id)
  if (!entryIds.length) return Response.json({ sent: 0 })

  const { data: slots } = await admin.from('booking_slots').select('id').in('event_entry_id', entryIds)
  const slotIds = (slots || []).map(s => s.id)
  if (!slotIds.length) return Response.json({ sent: 0 })

  const { data: bookings } = await admin.from('bookings')
    .select('id, name, email')
    .in('slot_id', slotIds)
    .is('cancelled_at', null)

  if (!bookings?.length) return Response.json({ sent: 0 })

  // Deduplicate by email
  const seen = new Set()
  const targets = bookings.filter(b => {
    if (!b.email || seen.has(b.email)) return false
    seen.add(b.email)
    return true
  })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const feedbackUrl = `${BASE_URL}/feedback`

  const html = `
<div style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#2f2244;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#0d1f3a,#1a3a60);padding:32px;color:#fff;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;opacity:0.6;letter-spacing:0.15em;">PHOTO FLEUR</p>
        <h1 style="margin:0;font-size:22px;font-weight:700;">ご来場ありがとうございました</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-size:15px;line-height:2;margin:0 0 24px;">
          この度はPhotoFleur撮影会にお越しいただき<br>誠にありがとうございました。
        </p>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;"/>

        <p style="font-size:14px;line-height:2;color:#555;margin:0 0 16px;">
          PhotoFleurでは日々改善・改良を重ね邁進しております。<br><br>
          下記のようなご意見がございましたら、ぜひお聞かせください。
        </p>
        <ul style="font-size:14px;line-height:2.2;color:#555;padding-left:20px;margin:0 0 20px;">
          <li>PhotoFleurで開催したいイベント</li>
          <li>おすすめの撮影場所</li>
          <li>撮影会のシステム的な問題・改善点</li>
          <li>その他ご意見</li>
        </ul>
        <p style="font-size:13px;color:#888;margin:0 0 24px;">
          ※送信専用ですので、返答が必要なものは公式LINEよりお願いいたします。
        </p>

        <div style="text-align:center;margin:28px 0;">
          <a href="${feedbackUrl}" style="display:inline-block;background:#1a3560;color:#fff;text-decoration:none;border-radius:10px;padding:14px 36px;font-size:15px;font-weight:700;letter-spacing:0.05em;">
            📮 ご意見箱はこちら
          </a>
          <p style="font-size:11px;color:#aaa;margin:8px 0 0;">※カメラマン会員登録が必要です</p>
        </div>

        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;"/>

        <p style="font-size:14px;font-weight:700;color:#0d1f3a;margin:0 0 8px;">【PhotoFleur公式LINEのご案内】</p>
        <p style="font-size:14px;line-height:2;color:#555;margin:0 0 12px;">
          公式LINEより最新の情報やクーポンを発信しております。<br>
          是非ご登録よろしくお願いいたします。
        </p>
        <p style="margin:0 0 24px;">
          <a href="https://lin.ee/VgTzmhe" style="color:#06C755;font-weight:700;font-size:14px;">公式LINE 🔗</a>
        </p>

        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;"/>

        <p style="font-size:14px;line-height:2;color:#555;margin:0 0 24px;">
          PhotoFleur撮影会は<br>
          ここに集まる全ての人が一人の人間として、<br>
          モデル、カメラマン、クリエーターとして、<br>
          それぞれが自分らしい<em>"花"</em>となり、芽生え咲き、輝ける。<br>
          そんな場所を目指しています。
        </p>

        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;"/>

        <p style="font-size:13px;line-height:2;color:#888;margin:0;">
          2025年9月13日に元被写体モデルの女子大生によって始動した未完成な撮影会です。それでも皆様の拠り所となれるよう日々改善、成長してまいりますのでよろしくお願いいたします。
        </p>

        <p style="margin:28px 0 0;font-size:13px;color:#aaa;text-align:right;">Photo Fleur運営</p>
      </div>
    </div>
  </div>
</div>`

  const results = await Promise.allSettled(
    targets.map(b =>
      resend.emails.send({
        from: 'Photo Fleur運営 <onboarding@resend.dev>',
        to: b.email,
        subject: 'この度はPhotoFleur撮影会にご来場いただきありがとうございました',
        html,
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return Response.json({ sent, total: targets.length })
}
