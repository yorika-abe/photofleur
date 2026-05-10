import { createSupabaseAdminClient } from '@/lib/supabase-server'

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
  const { id } = await params
  const supabase = await createSupabaseAdminClient()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  const { data: post } = await supabase.from('blog_posts').select('content, cover_image, pending_edits').eq('id', id).single()
  if (post) {
    const toDelete = new Set()
    if (post.cover_image?.startsWith(base)) toDelete.add(post.cover_image.replace(base, ''))
    // pending_edits のカバーも削除（本番と異なる場合）
    const pendingCover = post.pending_edits?.cover_image
    if (pendingCover && pendingCover !== post.cover_image && pendingCover.startsWith(base)) toDelete.add(pendingCover.replace(base, ''))
    extractStoragePaths(post.content, base).forEach(p => toDelete.add(p))
    // pending_edits のコンテンツ内メディアも削除（本番と重複しないもの）
    findRemovedPaths(post.content, post.pending_edits?.content || post.content, base).forEach(p => toDelete.add(p))
    if (toDelete.size > 0) await supabase.storage.from('images').remove([...toDelete])
  }

  await supabase.from('blog_posts').delete().eq('id', id)
  return Response.json({ ok: true })
}

export async function PATCH(req, { params }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createSupabaseAdminClient()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`

  // pending_edits の承認処理
  if (body._action === 'approve_pending_edits') {
    const { data: post } = await supabase.from('blog_posts').select('cover_image, content, pending_edits').eq('id', id).single()
    if (!post?.pending_edits) return Response.json({ error: 'No pending edits' }, { status: 400 })

    const edits = post.pending_edits
    const updates = { pending_edits: null }
    if (edits.title !== undefined) updates.title = edits.title
    if (edits.slug !== undefined) updates.slug = edits.slug
    if (edits.content !== undefined) updates.content = edits.content
    if ('cover_image' in edits) updates.cover_image = edits.cover_image
    if (edits.category !== undefined) updates.category = edits.category

    const toDelete = new Set()
    // 古いカバーが新しいカバーと違う場合は削除
    if ('cover_image' in edits && post.cover_image && post.cover_image !== edits.cover_image && post.cover_image.startsWith(base)) {
      toDelete.add(post.cover_image.replace(base, ''))
    }
    // 本文から削除されたメディアを削除
    if (edits.content !== undefined) {
      findRemovedPaths(post.content, edits.content, base).forEach(p => toDelete.add(p))
    }
    if (toDelete.size > 0) await supabase.storage.from('images').remove([...toDelete])

    const { error } = await supabase.from('blog_posts').update(updates).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, updates })
  }

  // 通常編集：古いカバー・コンテンツ内メディアを削除
  const { data: current } = await supabase.from('blog_posts').select('cover_image, content').eq('id', id).single()
  if (current) {
    const toDelete = new Set()
    if ('cover_image' in body && current.cover_image && current.cover_image !== body.cover_image && current.cover_image.startsWith(base)) {
      toDelete.add(current.cover_image.replace(base, ''))
    }
    if ('content' in body) {
      findRemovedPaths(current.content, body.content, base).forEach(p => toDelete.add(p))
    }
    if (toDelete.size > 0) await supabase.storage.from('images').remove([...toDelete])
  }

  const { error } = await supabase.from('blog_posts').update(body).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
