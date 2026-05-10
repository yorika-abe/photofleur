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

export async function DELETE(_req, { params }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  const { data: post } = await admin.from('blog_posts').select('content, cover_image, author_id, pending_edits').eq('id', id).maybeSingle()
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
  if (post.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const toDelete = []
  if (post.cover_image?.startsWith(base)) toDelete.push(post.cover_image.replace(base, ''))
  const pendingCover = post.pending_edits?.cover_image
  if (pendingCover && pendingCover !== post.cover_image && pendingCover.startsWith(base)) toDelete.push(pendingCover.replace(base, ''))
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

  const { data: post } = await admin.from('blog_posts').select('cover_image, author_id, status, pending_edits').eq('id', id).maybeSingle()
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
  if (post.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  if (post.status === 'published') {
    // 公開中記事は pending_edits に保存（本番には反映しない）
    const newPendingCover = body.cover_image !== undefined ? body.cover_image : (post.pending_edits?.cover_image ?? null)
    const oldPendingCover = post.pending_edits?.cover_image
    // 古い pending カバーを削除（ライブカバーとは別）
    if (oldPendingCover && oldPendingCover !== newPendingCover && oldPendingCover !== post.cover_image && oldPendingCover.startsWith(base)) {
      await admin.storage.from('images').remove([oldPendingCover.replace(base, '')])
    }
    const pendingEdits = {
      ...post.pending_edits,
      title: body.title ?? post.pending_edits?.title,
      slug: body.slug ?? post.pending_edits?.slug,
      content: body.content ?? post.pending_edits?.content,
      cover_image: newPendingCover,
      category: body.category ?? post.pending_edits?.category,
      submitted: body.submitted ?? post.pending_edits?.submitted ?? false,
    }
    await admin.from('blog_posts').update({ pending_edits: pendingEdits, updated_at: new Date().toISOString() }).eq('id', id)
  } else {
    // 非公開記事はメインフィールドを更新
    if ('cover_image' in body && post.cover_image && post.cover_image !== body.cover_image && post.cover_image.startsWith(base)) {
      await admin.storage.from('images').remove([post.cover_image.replace(base, '')])
    }
    const { error } = await admin.from('blog_posts').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
