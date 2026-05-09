import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const [{ data: postsData }, { data: avatarSetting }] = await Promise.all([
    admin.from('blog_posts')
      .select('author_id, posted_as_admin, user_profiles!author_id(name, role, roles)')
      .eq('status', 'published'),
    admin.from('site_settings').select('value').eq('key', 'admin_avatar_url').maybeSingle(),
  ])
  const adminAvatarUrl = avatarSetting?.value || null
  if (!postsData) return Response.json([])

  const adminIds = []
  const modelAuthors = []
  const seenAdmins = new Set()
  const seenModels = new Set()

  for (const p of postsData) {
    if (!p.author_id) continue
    const profile = p.user_profiles
    const isAdminRole = profile?.role === 'owner' || profile?.roles?.includes('admin')

    if (isAdminRole && p.posted_as_admin) {
      if (!seenAdmins.has(p.author_id)) {
        seenAdmins.add(p.author_id)
        adminIds.push(p.author_id)
      }
    } else {
      if (!seenModels.has(p.author_id)) {
        seenModels.add(p.author_id)
        modelAuthors.push({
          id: p.author_id,
          name: (profile?.name || p.author_id).replace(/^運営\s*/, '') || profile?.name || p.author_id,
          avatar: null,
        })
      }
    }
  }

  const result = []
  if (adminIds.length > 0) {
    result.push({ id: '__admin__', name: '運営', avatar: adminAvatarUrl, adminIds })
  }
  result.push(...modelAuthors)
  return Response.json(result)
}
