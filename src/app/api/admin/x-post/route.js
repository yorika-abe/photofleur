import { TwitterApi } from 'twitter-api-v2'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function getClient() {
  return new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  })
}

async function checkAdmin() {
  const { createSupabaseServerClient } = await import('@/lib/supabase-server')
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return false
  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('roles, role').eq('id', user.id).single()
  const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
  return roles.includes('admin')
}

export async function POST(req) {
  const isAdmin = await checkAdmin()
  if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { text, imageUrl } = await req.json()
  if (!text?.trim()) return Response.json({ error: 'text required' }, { status: 400 })

  try {
    const client = getClient()
    let mediaId

    if (imageUrl) {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer())
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        mediaId = await client.v1.uploadMedia(buffer, { mimeType })
      }
    }

    const params = { text }
    if (mediaId) params.media = { media_ids: [mediaId] }
    const tweet = await client.v2.tweet(params)

    return Response.json({ ok: true, id: tweet.data.id })
  } catch (e) {
    console.error('X post error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
