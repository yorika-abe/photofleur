import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function PATCH(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { suffix } = await req.json()
  const name = suffix?.trim() ? `運営 ${suffix.trim()}` : '運営'

  const admin = await createSupabaseAdminClient()
  await admin.from('user_profiles').update({ name }).eq('id', user.id)

  return Response.json({ ok: true, name })
}
