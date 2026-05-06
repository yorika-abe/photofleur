import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function getAdminAuth() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return { error: 'Forbidden', status: 403 }
  return { admin }
}

export async function GET() {
  const auth = await getAdminAuth()
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status })

  const { data } = await auth.admin
    .from('external_activity_reports')
    .select('id, report_date, content, is_read, created_at, models(id, name, image)')
    .order('created_at', { ascending: false })

  return Response.json(data || [])
}

export async function PATCH() {
  const auth = await getAdminAuth()
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status })

  await auth.admin
    .from('external_activity_reports')
    .update({ is_read: true })
    .eq('is_read', false)

  return Response.json({ ok: true })
}
