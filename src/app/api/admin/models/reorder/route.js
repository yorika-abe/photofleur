import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(req) {
  const supabase = await createSupabaseAdminClient()
  const { ids } = await req.json()
  if (!Array.isArray(ids)) return Response.json({ error: 'invalid' }, { status: 400 })
  const updates = ids.map((id, i) => supabase.from('models').update({ display_order: i }).eq('id', id))
  await Promise.all(updates)
  return Response.json({ ok: true })
}
