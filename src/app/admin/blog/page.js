'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_LABEL = { draft: '下書き', pending_review: '承認待ち', published: '公開中' }
const STATUS_COLOR = {
  draft: { bg: '#f5f5f5', color: '#888' },
  pending_review: { bg: '#fff3e0', color: '#e65100' },
  published: { bg: '#e8f5e9', color: '#388e3c' },
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, status, category, published_at, created_at, author_id')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
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

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px' }}>
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all', '全て'], ['pending_review', '承認待ち'], ['published', '公開中'], ['draft', '下書き']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', borderColor: filter === key ? '#2f2244' : '#ddd', background: filter === key ? '#2f2244' : '#fff', color: filter === key ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {label}
            {key !== 'all' && ` (${posts.filter(p => p.status === key).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#999' }}>該当する記事はありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(post => {
            const sc = STATUS_COLOR[post.status] || STATUS_COLOR.draft
            return (
              <div key={post.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2f2244', marginBottom: 4 }}>{post.title}</div>
                  <div style={{ fontSize: 12, color: '#aaa', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {post.category && <span style={{ background: '#e8f5e9', color: '#388e3c', borderRadius: 4, padding: '1px 6px' }}>{post.category}</span>}
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {post.status === 'pending_review' && (
                    <button onClick={() => updateStatus(post.id, 'published')}
                      style={{ background: '#e8f5e9', color: '#388e3c', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                      承認・公開
                    </button>
                  )}
                  {post.status === 'published' && (
                    <button onClick={() => updateStatus(post.id, 'draft')}
                      style={{ background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                      非公開に
                    </button>
                  )}
                  {post.status === 'draft' && (
                    <button onClick={() => updateStatus(post.id, 'published')}
                      style={{ background: '#e8eaf6', color: '#3949ab', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      公開する
                    </button>
                  )}
                  <Link href={`/admin/blog/${post.id}`}
                    style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                    編集
                  </Link>
                  {post.status === 'published' && (
                    <Link href={`/blog/${post.slug}`} target="_blank"
                      style={{ background: '#f8f5ff', color: '#2f2244', textDecoration: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13 }}>
                      表示 →
                    </Link>
                  )}
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
