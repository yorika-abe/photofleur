import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'
import { notifyAdmin } from '@/lib/notify-admin'

export async function POST(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim() || content.trim().length > 5000) return Response.json({ error: 'フィードバックの内容が不正です' }, { status: 400 })

  const admin = await createSupabaseAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('sns_url')
    .eq('id', user.id)
    .single()

  const { error } = await admin.from('feedbacks').insert({
    user_id: user.id,
    user_email: user.email,
    content: content.trim(),
    sns_url: profile?.sns_url || null,
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await notifyAdmin(admin, 'admin_feedback').catch(() => {})
  return Response.json({ ok: true })
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await admin.from('feedbacks').select('*').order('created_at', { ascending: false })
  return Response.json(data || [])
}
