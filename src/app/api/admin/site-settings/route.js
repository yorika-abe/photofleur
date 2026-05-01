import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role, roles').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  if (!roles.includes('admin')) return null
  return admin
}

export async function GET() {
  const admin = await createSupabaseAdminClient()
  const { data } = await admin.from('site_settings').select('key, value')
  const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  return Response.json(settings)
}

// 画像URLを含むキー（配列 or 単体）
const ARRAY_IMAGE_KEYS = ['hero_bg_images', 'hero_bg_images_mobile', 'recruit_bg_images', 'request_hero_image', 'recruit_hero_image']
const SINGLE_IMAGE_KEYS = ['hero_video', 'hero_video_2', 'mission_bg', 'recruit_bg_video']

export async function POST(req) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  // 現在の設定を取得して削除すべき画像を特定
  const { data: current } = await admin.from('site_settings').select('key, value')
  const currentMap = Object.fromEntries((current || []).map(r => [r.key, r.value]))
  const toDelete = []

  for (const key of ARRAY_IMAGE_KEYS) {
    if (!(key in body)) continue
    const oldUrls = (() => { try { return JSON.parse(currentMap[key] || '[]') } catch { return [] } })()
    const newUrls = (() => { try { return JSON.parse(body[key] || '[]') } catch { return [] } })()
    for (const url of oldUrls) {
      if (!newUrls.includes(url) && url?.startsWith(base)) toDelete.push(url.replace(base, ''))
    }
  }

  for (const key of SINGLE_IMAGE_KEYS) {
    if (!(key in body)) continue
    const oldUrl = currentMap[key]
    const newUrl = body[key]
    if (oldUrl && oldUrl !== newUrl && oldUrl.startsWith(base)) toDelete.push(oldUrl.replace(base, ''))
  }

  if (toDelete.length > 0) await admin.storage.from('images').remove(toDelete)

  const entries = Object.entries(body).map(([key, value]) => ({
    key, value, updated_at: new Date().toISOString(),
  }))
  const { error } = await admin.from('site_settings').upsert(entries, { onConflict: 'key' })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
