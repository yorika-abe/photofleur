import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role, roles').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return null
  return admin
}

export async function GET(req, { params }) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data } = await admin.from('model_private_info').select('*').eq('model_id', id).single()
  return Response.json(data || {})
}
