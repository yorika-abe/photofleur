import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function PATCH(req) {
  const { userId, role } = await req.json()
  const supabase = await createSupabaseAdminClient()
  const { error } = await supabase.from('user_profiles').update({ role }).eq('id', userId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
