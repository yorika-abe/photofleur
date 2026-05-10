import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

function extractStoragePaths(content, base) {
  if (!content) return []
  const urls = [...content.matchAll(/src="([^"]+)"/g)].map(m => m[1])
  return urls.filter(u => u.startsWith(base)).map(u => u.replace(base, ''))
}

async function getAuthUser() {
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  return user
}

export async function DELETE(req, { params }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  const { data: post } = await admin.from('blog_posts').select('content, cover_image, author_id').eq('id', id).maybeSingle()
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
  if (post.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const toDelete = []
  if (post.cover_image?.startsWith(base)) toDelete.push(post.cover_image.replace(base, ''))
  toDelete.push(...extractStoragePaths(post.content, base))
  if (toDelete.length > 0) await admin.storage.from('images').remove(toDelete)

  await admin.from('blog_posts').delete().eq('id', id)
  return Response.json({ ok: true })
}

export async function PATCH(req, { params }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const body = await req.json()

  const { data: post } = await admin.from('blog_posts').select('cover_image, author_id').eq('id', id).maybeSingle()
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
  if (post.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`
  if ('cover_image' in body && post.cover_image && post.cover_image !== body.cover_image && post.cover_image.startsWith(base)) {
    await admin.storage.from('images').remove([post.cover_image.replace(base, '')])
  }

  const { error } = await admin.from('blog_posts').update(body).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
