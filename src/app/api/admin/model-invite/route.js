import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin') ? admin : null
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://photofleur.vercel.app'
  const token = process.env.MODEL_INVITE_TOKEN || ''
  const inviteUrl = `${base}/model-register?token=${token}`

  return Response.json({ inviteUrl })
}
