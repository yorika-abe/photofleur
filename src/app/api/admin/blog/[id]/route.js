import { createSupabaseAdminClient } from '@/lib/supabase-server'

function extractStoragePaths(content, base) {
  if (!content) return []
  const urls = [...content.matchAll(/src="([^"]+)"/g)].map(m => m[1])
  return urls.filter(u => u.startsWith(base)).map(u => u.replace(base, ''))
}

export async function DELETE(req, { params }) {
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  const { data: post } = await supabase.from('blog_posts').select('content, cover_image').eq('id', id).single()
  if (post) {
    const toDelete = []
    if (post.cover_image?.startsWith(base)) toDelete.push(post.cover_image.replace(base, ''))
    toDelete.push(...extractStoragePaths(post.content, base))
    if (toDelete.length > 0) await supabase.storage.from('images').remove(toDelete)
  }

  await supabase.from('blog_posts').delete().eq('id', id)
  return Response.json({ ok: true })
}

export async function PATCH(req, { params }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createSupabaseAdminClient()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  // カバー画像が変わった場合、旧画像を削除
  if ('cover_image' in body) {
    const { data: current } = await supabase.from('blog_posts').select('cover_image').eq('id', id).single()
    if (current?.cover_image && current.cover_image !== body.cover_image && current.cover_image.startsWith(base)) {
      await supabase.storage.from('images').remove([current.cover_image.replace(base, '')])
    }
  }

  const { error } = await supabase.from('blog_posts').update(body).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
