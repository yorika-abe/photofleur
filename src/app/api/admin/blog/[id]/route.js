import { requireAdmin } from '@/lib/auth'
import { deleteFromR2, R2_BASE } from '@/lib/r2'
import { sendLineMessage } from '@/lib/line'
import { DEFAULTS } from '@/app/api/admin/line-templates/route'

async function sendBlogLineNotification(admin, authorId, templateKey) {
  if (!authorId) return
  const { data: model } = await admin.from('models').select('line_id').eq('user_id', authorId).maybeSingle()
  if (!model?.line_id) return
  const { data: tmplRow } = await admin.from('line_templates').select('body').eq('key', templateKey).maybeSingle()
  const message = tmplRow?.body || DEFAULTS[templateKey]
  sendLineMessage(model.line_id, message).catch(err => console.error('LINE送信エラー:', err))
}

function extractStoragePaths(content, base) {
  if (!content) return []
  const urls = [...content.matchAll(/src="([^"]+)"/g)].map(m => m[1])
  return urls.filter(u => u.startsWith(base)).map(u => u.replace(base, ''))
}

function findRemovedPaths(oldContent, newContent, base) {
  const oldPaths = extractStoragePaths(oldContent, base)
  const newSet = new Set(extractStoragePaths(newContent, base))
  return oldPaths.filter(p => !newSet.has(p))
}

export async function DELETE(_req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const base = R2_BASE()

  const { data: post } = await admin.from('blog_posts').select('content, cover_image, pending_edits').eq('id', id).single()
  if (post) {
    const toDelete = new Set()
    if (post.cover_image?.startsWith(base)) toDelete.add(post.cover_image)
    const pendingCover = post.pending_edits?.cover_image
    if (pendingCover && pendingCover !== post.cover_image && pendingCover.startsWith(base)) toDelete.add(pendingCover)
    extractStoragePaths(post.content, base).forEach(p => toDelete.add(`${base}${p}`))
    findRemovedPaths(post.content, post.pending_edits?.content || post.content, base).forEach(p => toDelete.add(`${base}${p}`))
    if (toDelete.size > 0) await deleteFromR2([...toDelete])
  }

  await admin.from('blog_posts').delete().eq('id', id)
  return Response.json({ ok: true })
}

export async function PATCH(req, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const base = R2_BASE()

  if (body._action === 'approve_new') {
    const { data: post } = await admin.from('blog_posts').select('author_id, posted_as_admin').eq('id', id).single()
    const updates = { status: 'published', published_at: new Date().toISOString() }
    const { error } = await admin.from('blog_posts').update(updates).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!post?.posted_as_admin) await sendBlogLineNotification(admin, post?.author_id, 'blog_post_approved')
    return Response.json({ ok: true, updates })
  }

  if (body._action === 'reject_pending_edits') {
    const { data: post } = await admin.from('blog_posts').select('author_id, posted_as_admin').eq('id', id).single()
    const { error } = await admin.from('blog_posts').update({ pending_edits: null }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!post?.posted_as_admin) await sendBlogLineNotification(admin, post?.author_id, 'blog_post_rejected')
    return Response.json({ ok: true })
  }

  if (body._action === 'approve_pending_edits') {
    const { data: post } = await admin.from('blog_posts').select('cover_image, content, pending_edits, author_id, posted_as_admin').eq('id', id).single()
    if (!post?.pending_edits) return Response.json({ error: 'No pending edits' }, { status: 400 })

    const edits = post.pending_edits
    const updates = { pending_edits: null }
    if (edits.title !== undefined) updates.title = edits.title
    if (edits.slug !== undefined) updates.slug = edits.slug
    if (edits.content !== undefined) updates.content = edits.content
    if ('cover_image' in edits) updates.cover_image = edits.cover_image
    if (edits.category !== undefined) updates.category = edits.category

    const toDelete = []
    if ('cover_image' in edits && post.cover_image && post.cover_image !== edits.cover_image) toDelete.push(post.cover_image)
    if (edits.content !== undefined) {
      findRemovedPaths(post.content, edits.content, base).forEach(p => toDelete.push(`${base}${p}`))
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)

    const { error } = await admin.from('blog_posts').update(updates).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!post.posted_as_admin) await sendBlogLineNotification(admin, post.author_id, 'blog_post_approved')
    return Response.json({ ok: true, updates })
  }

  const { data: current } = await admin.from('blog_posts').select('cover_image, content').eq('id', id).single()
  if (current) {
    const toDelete = []
    if ('cover_image' in body && current.cover_image && current.cover_image !== body.cover_image) toDelete.push(current.cover_image)
    if ('content' in body) {
      findRemovedPaths(current.content, body.content, base).forEach(p => toDelete.push(`${base}${p}`))
    }
    if (toDelete.length > 0) await deleteFromR2(toDelete)
  }

  const { error } = await admin.from('blog_posts').update(body).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
