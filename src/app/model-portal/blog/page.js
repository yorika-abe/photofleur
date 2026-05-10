'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const STATUS_LABEL = { draft: '下書き', pending_review: '承認待ち', published: '公開中' }
const STATUS_COLOR = {
  draft: { bg: '#f5f5f5', color: '#888' },
  pending_review: { bg: '#ffebee', color: '#c62828' },
  published: { bg: '#e8f5e9', color: '#388e3c' },
}

export default function ModelBlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('user_profiles').select('roles, role').eq('id', user.id).single()
      const roles = profile?.roles?.length > 0 ? profile.roles : (profile?.role ? [profile.role] : [])
      if (!roles.includes('model')) { window.location.href = '/'; return }

      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, status, published_at, created_at')
        .eq('author_id', user.id)
        .neq('posted_as_admin', true)
        .order('created_at', { ascending: false })
      setPosts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function submitForReview(id) {
    await supabase.from('blog_posts').update({ status: 'pending_review' }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'pending_review' } : p))
  }

  async function cancelReview(id) {
    await supabase.from('blog_posts').update({ status: 'draft' }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'draft' } : p))
  }

  async function requestUnpublish(id) {
    if (!confirm('この記事の非公開を申請しますか？運営が確認後に非公開になります。')) return
    await supabase.from('blog_posts').update({ status: 'pending_review' }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'pending_review' } : p))
  }

  async function deletePost(id) {
    if (!confirm('この記事を削除しますか？画像も含めて完全に削除されます。')) return
    const res = await fetch(`/api/model-portal/blog/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('削除に失敗しました'); return }
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/model-portal/shifts" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← モデルポータル</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 28px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: 0 }}>ブログ記事</h1>
        <Link href="/model-portal/blog/new"
          style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 14 }}>
          + 新規作成
        </Link>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#999' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
          <p>まだ記事がありません。最初の記事を書いてみましょう。</p>
          <Link href="/model-portal/blog/new"
            style={{ display: 'inline-block', marginTop: 16, background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600 }}>
            記事を書く
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(post => {
            const sc = STATUS_COLOR[post.status] || STATUS_COLOR.draft
            return (
              <div key={post.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2f2244', marginBottom: 4 }}>{post.title}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {post.published_at
                      ? `公開: ${new Date(post.published_at).toLocaleDateString('ja-JP')}`
                      : `作成: ${new Date(post.created_at).toLocaleDateString('ja-JP')}`}
                  </div>
                </div>
                <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {STATUS_LABEL[post.status]}
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {post.status === 'draft' && (
                    <>
                      <Link href={`/model-portal/blog/${post.id}`}
                        style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                        編集
                      </Link>
                      <button onClick={() => submitForReview(post.id)}
                        style={{ background: '#e3f2fd', color: '#1a3560', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        承認申請
                      </button>
                    </>
                  )}
                  {post.status === 'pending_review' && (
                    <button onClick={() => cancelReview(post.id)}
                      style={{ background: '#fff8e1', color: '#f57f17', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      申請取消
                    </button>
                  )}
                  {post.status === 'published' && (
                    <>
                      <Link href={`/blog/${post.slug}`} target="_blank"
                        style={{ background: '#e8f5e9', color: '#388e3c', textDecoration: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                        表示 →
                      </Link>
                      <button onClick={() => requestUnpublish(post.id)}
                        style={{ background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                        非公開申請
                      </button>
                    </>
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
