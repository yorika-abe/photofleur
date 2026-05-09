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
  const modelAuthorIds = []
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
        modelAuthorIds.push(p.author_id)
      }
    }
  }

  // モデルテーブルから芸名・宣材写真を取得
  let modelAuthors = []
  if (modelAuthorIds.length > 0) {
    const { data: modelsData } = await admin
      .from('models')
      .select('user_id, name, image')
      .in('user_id', modelAuthorIds)

    modelAuthors = modelAuthorIds.map(id => {
      const m = modelsData?.find(m => m.user_id === id)
      return {
        id,
        name: m?.name || id,
        avatar: m?.image || null,
      }
    })
  }

  const result = []
  if (adminIds.length > 0) {
    result.push({ id: '__admin__', name: '運営', avatar: adminAvatarUrl, adminIds })
  }
  result.push(...modelAuthors)
  return Response.json(result)
}
