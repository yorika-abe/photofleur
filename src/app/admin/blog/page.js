'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_LABEL = { draft: '下書き', pending_review: '承認待ち', published: '公開中', pending_delete: '削除申請中' }
const STATUS_COLOR = {
  draft: { bg: '#f5f5f5', color: '#888' },
  pending_review: { bg: '#ffebee', color: '#c62828' },
  published: { bg: '#e8f5e9', color: '#388e3c' },
  pending_delete: { bg: '#fce4ec', color: '#ad1457' },
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [categories, setCategories] = useState([])
  const [authors, setAuthors] = useState([])
  const [featuredIds, setFeaturedIds] = useState([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  async function load() {
    setLoading(true)
    fetch('/api/admin/blog/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []))
    const [{ data: postsData }, { data: settingRow }] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('id, title, slug, status, category, published_at, created_at, author_id, posted_as_admin, pending_edits, user_profiles!author_id(name)')
        .order('created_at', { ascending: false }),
      supabase.from('site_settings').select('value').eq('key', 'blog_featured_ids').maybeSingle(),
    ])
    const posts = postsData || []
    const ids = JSON.parse(settingRow?.value || '[]')
    setFeaturedIds(ids)

    // モデル画面投稿の author_id を収集してモデルテーブルから芸名取得
    const modelAuthorIds = [...new Set(posts.filter(p => !p.posted_as_admin && p.author_id).map(p => p.author_id))]
    let modelNameMap = {}
    if (modelAuthorIds.length > 0) {
      const { data: modelsData } = await supabase.from('models').select('user_id, name').in('user_id', modelAuthorIds)
      if (modelsData) modelsData.forEach(m => { modelNameMap[m.user_id] = m.name })
    }

    const postsWithName = posts.map(p => ({
      ...p,
      _authorName: p.posted_as_admin
        ? (p.user_profiles?.name || p.author_id)
        : (modelNameMap[p.author_id] || p.user_profiles?.name?.replace(/^運営\s*/, '') || p.author_id),
    }))
    setPosts(postsWithName)

    // build unique authors
    const seen = new Set()
    const unique = []
    for (const p of postsWithName) {
      if (p.author_id && !seen.has(p.author_id)) {
        seen.add(p.author_id)
        unique.push({ id: p.author_id, name: p._authorName })
      }
    }
    setAuthors(unique)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function approvePendingEdits(post) {
    const res = await fetch(`/api/admin/blog/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'approve_pending_edits' }),
    })
    if (!res.ok) { alert('エラーが発生しました'); return }
    const { updates } = await res.json()
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, ...updates, pending_edits: null } : p))
  }

  async function rejectPendingEdits(id) {
    await fetch(`/api/admin/blog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'reject_pending_edits' }),
    })
    setPosts(prev => prev.map(p => p.id === id ? { ...p, pending_edits: null } : p))
  }

  async function updateStatus(id, status, fromPendingReview) {
    if (fromPendingReview && status === 'published') {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'approve_new' }),
      })
      if (!res.ok) { alert('エラーが発生しました'); return }
      const { updates } = await res.json()
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      return
    }
    const updates = { status }
    if (status === 'published') updates.published_at = new Date().toISOString()
    await supabase.from('blog_posts').update(updates).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  async function deletePost(id) {
    if (!confirm('この記事を削除しますか？記事内の画像・動画もすべて削除されます。')) return
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  async function toggleFeatured(id) {
    const next = featuredIds.includes(id) ? featuredIds.filter(x => x !== id) : [...featuredIds, id]
    await supabase.from('site_settings').upsert({ key: 'blog_featured_ids', value: JSON.stringify(next) }, { onConflict: 'key' })
    setFeaturedIds(next)
  }

  const filtered = posts.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (catFilter === '__none__' && p.category) return false
    if (catFilter && catFilter !== '__none__' && p.category !== catFilter) return false
    if (authorFilter && p.author_id !== authorFilter) return false
    if (favOnly && !featuredIds.includes(p.id)) return false
    if (searchTitle && !p.title?.toLowerCase().includes(searchTitle.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: 0 }}>ブログ管理</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/blog/categories"
            style={{ background: '#f0f4fb', color: '#1a3560', textDecoration: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>
            カテゴリー管理
          </Link>
          <Link href="/admin/blog/new"
            style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 14 }}>
            + 新規作成
          </Link>
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['all', '全て'], ['pending_review', '承認待ち'], ['pending_delete', '削除申請'], ['published', '公開中'], ['draft', '下書き']].map(([key, label]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', borderColor: statusFilter === key ? '#2f2244' : '#ddd', background: statusFilter === key ? '#2f2244' : '#fff', color: statusFilter === key ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {label}
            {key !== 'all' && ` (${posts.filter(p => p.status === key).length})`}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={searchTitle}
          onChange={e => setSearchTitle(e.target.value)}
          placeholder="タイトルで検索..."
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, minWidth: 180 }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}>
          <option value="">カテゴリー：すべて</option>
          <option value="__none__">未分類</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        {authors.length > 1 && (
          <select value={authorFilter} onChange={e => setAuthorFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}>
            <option value="">作者：すべて</option>
            {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <button onClick={() => setFavOnly(v => !v)}
          style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', borderColor: favOnly ? '#f4a020' : '#ddd', background: favOnly ? '#fff8e8' : '#fff', color: favOnly ? '#c07800' : '#888', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          ☆ お気に入りのみ
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#999' }}>該当する記事はありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(post => {
            const sc = STATUS_COLOR[post.status] || STATUS_COLOR.draft
            const isFav = featuredIds.includes(post.id)
            const catLabel = categories.find(c => c.slug === post.category)?.name || post.category
            return (
              <div key={post.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2f2244', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {post.title}
                    {post.pending_edits?.submitted && (
                      <span style={{ fontSize: 10, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>編集申請</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {post.category && <span style={{ background: '#e8f5e9', color: '#388e3c', borderRadius: 4, padding: '1px 6px' }}>{catLabel}</span>}
                    {post._authorName && <span>{post._authorName}</span>}
                    <span>
                      {post.published_at
                        ? `公開: ${new Date(post.published_at).toLocaleDateString('ja-JP')}`
                        : `作成: ${new Date(post.created_at).toLocaleDateString('ja-JP')}`}
                    </span>
                  </div>
                </div>
                <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {STATUS_LABEL[post.status]}
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {post.status === 'pending_review' && (
                    <button onClick={() => updateStatus(post.id, 'published', true)}
                      style={{ background: '#e8f5e9', color: '#388e3c', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                      承認・公開
                    </button>
                  )}
                  {post.status === 'pending_delete' && (
                    <button onClick={() => deletePost(post.id)}
                      style={{ background: '#fce4ec', color: '#ad1457', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                      削除を実行
                    </button>
                  )}
                  {post.status === 'published' && post.pending_edits?.submitted && (
                    <>
                      <button onClick={() => approvePendingEdits(post)}
                        style={{ background: '#e8f5e9', color: '#388e3c', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        編集承認
                      </button>
                      <button onClick={() => rejectPendingEdits(post.id)}
                        style={{ background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                        却下
                      </button>
                    </>
                  )}
                  {post.status === 'published' && (
                    <button onClick={() => updateStatus(post.id, 'draft')}
                      style={{ background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                      非公開に
                    </button>
                  )}
                  {post.status === 'draft' && (
                    <button onClick={() => updateStatus(post.id, 'published')}
                      style={{ background: '#e3f2fd', color: '#1a3560', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      公開する
                    </button>
                  )}
                  <Link href={`/admin/blog/${post.id}`}
                    style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                    編集
                  </Link>
                  <button onClick={() => toggleFeatured(post.id)}
                    title="HOMEお気に入り"
                    style={{ background: isFav ? '#fff8e8' : '#f8f8f8', color: isFav ? '#c07800' : '#bbb', border: `1.5px solid ${isFav ? '#f4a020' : '#ddd'}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                    {isFav ? '★' : '☆'}
                  </button>
                  <button onClick={() => deletePost(post.id)}
                    style={{ background: '#fce4ec', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                    削除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
