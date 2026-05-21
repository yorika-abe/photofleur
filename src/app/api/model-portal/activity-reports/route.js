import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { notifyAdmin } from '@/lib/notify-admin'

async function getAuth() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.some(r => ['model', 'admin'].includes(r))) return { error: 'Forbidden', status: 403 }
  return { user, admin, roles }
}

export async function GET(req) {
  const auth = await getAuth()
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status })
  const { user, admin } = auth

  const { data: model } = await admin.from('models').select('id').eq('user_id', user.id).single()
  if (!model) return Response.json({ error: 'model not found' }, { status: 404 })

  const { data } = await admin
    .from('external_activity_reports')
    .select('id, report_date, content, created_at')
    .eq('model_id', model.id)
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false })

  return Response.json(data || [])
}

export async function POST(req) {
  const auth = await getAuth()
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status })
  const { user, admin } = auth

  const { data: model } = await admin.from('models').select('id').eq('user_id', user.id).single()
  if (!model) return Response.json({ error: 'model not found' }, { status: 404 })

  const { report_date, content } = await req.json()
  if (!report_date || !content?.trim()) {
    return Response.json({ error: '日付と内容を入力してください' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('external_activity_reports')
    .insert({ model_id: model.id, report_date, content: content.trim() })
    .select('id, report_date, content, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  await notifyAdmin(admin, 'admin_activity_report').catch(() => {})
  return Response.json(data)
}
