import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET ?ids=uuid1,uuid2 → returns map of id → { name, avatar_url }
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []
  if (!ids.length) return Response.json({ profiles: {} })

  const admin = await createSupabaseAdminClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, name, avatar_url')
    .in('id', ids)

  const profiles = {}
  for (const p of (data || [])) {
    profiles[p.id] = { name: p.name, avatar_url: p.avatar_url }
  }
  return Response.json({ profiles })
}
