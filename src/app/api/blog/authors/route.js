import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const [{ data: postsData }, { data: avatarSetting }] = await Promise.all([
    admin.from('blog_posts')
      .select('author_id, user_profiles!author_id(name, role, roles)')
      .eq('status', 'published'),
    admin.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle(),
  ])
  const adminAvatarUrl = avatarSetting?.value || null
  if (!postsData) return Response.json([])
  const seen = new Set()
  const unique = []
  for (const p of postsData) {
    if (p.author_id && !seen.has(p.author_id)) {
      seen.add(p.author_id)
      const profile = p.user_profiles
      const isAdmin = profile?.role === 'owner' || profile?.roles?.includes('admin')
      unique.push({
        id: p.author_id,
        name: profile?.name || p.author_id,
        avatar: isAdmin ? adminAvatarUrl : null,
      })
    }
  }
  return Response.json(unique)
}
