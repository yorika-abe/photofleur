import { createSupabaseAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET ?ids=uuid1,uuid2 → returns map of id → { name, avatar_url }
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []
  if (!ids.length) return Response.json({ profiles: {} })

  const admin = await createSupabaseAdminClient()

  // Avatar is stored in site_settings, not user_profiles
  const [{ data: profilesData }, { data: avatarSetting }] = await Promise.all([
    admin.from('user_profiles').select('id, name').in('id', ids),
    admin.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle(),
  ])

  const avatarUrl = avatarSetting?.value || null

  const profiles = {}
  for (const p of (profilesData || [])) {
    profiles[p.id] = { name: p.name, avatar_url: avatarUrl }
  }
  return Response.json({ profiles })
}
