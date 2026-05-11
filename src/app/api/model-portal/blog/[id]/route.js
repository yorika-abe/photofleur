import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { deleteFromR2, R2_BASE } from '@/lib/r2'

function extractUrls(content, base) {
  if (!content) return []
  return [...content.matchAll(/src="([^"]+)"/g)].map(m => m[1]).filter(u => u.startsWith(base))
}

function findRemovedUrls(oldContent, newContent, base) {
  const oldUrls = extractUrls(oldContent, base)
  const newSet = new Set(extractUrls(newContent, base))
  return oldUrls.filter(u => !newSet.has(u))
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
  const base = R2_BASE()

  const { data: post } = await admin.from('blog_posts').select('content, cover_image, author_id, pending_edits').eq('id', id).maybeSingle()
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
  if (post.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const toDelete = []
  if (post.cover_image?.startsWith(base)) toDelete.push(post.cover_image)
  const pendingCover = post.pending_edits?.cover_image
  if (pendingCover && pendingCover !== post.cover_image && pendingCover.startsWith(base)) toDelete.push(pendingCover)
  toDelete.push(...extractUrls(post.content, base))
  if (toDelete.length > 0) await deleteFromR2(toDelete)

  await admin.from('blog_posts').delete().eq('id', id)
  return Response.json({ ok: true })
}

export async function PATCH(req, { params }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const body = await req.json()
  const base = R2_BASE()

  const { data: post } = await admin.from('blog_posts').select('cover_image, author_id, status, content, pending_edits').eq('id', id).maybeSingle()
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
  if (post.author_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  if (post.status === 'published') {
    const newPendingCover = body.cover_image !== undefined ? body.cover_image : (post.pending_edits?.cover_image ?? null)
    const oldPendingCover = post.pending_edits?.cover_image
    const toDelete = []
    if (oldPendingCover && oldPendingCover !== newPendingCover && oldPendingCover !== post.cover_image) toDelete.push(oldPendingCover)
    if (body.content !== undefined) {
      toDelete.push(...findRemovedUrls(post.pending_edits?.content ?? '', body.content, base))
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)

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
    const toDelete = []
    if ('cover_image' in body && post.cover_image && post.cover_image !== body.cover_image) toDelete.push(post.cover_image)
    if ('content' in body) toDelete.push(...findRemovedUrls(post.content, body.content, base))
    if (toDelete.length > 0) await deleteFromR2(toDelete)
    const { error } = await admin.from('blog_posts').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
