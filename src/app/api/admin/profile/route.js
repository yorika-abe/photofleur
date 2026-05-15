import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req) {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { suffix } = await req.json()
  const name = suffix?.trim() ? `運営 ${suffix.trim()}` : '運営'

  await admin.from('user_profiles').update({ name }).eq('id', user.id)

  return Response.json({ ok: true, name })
}
