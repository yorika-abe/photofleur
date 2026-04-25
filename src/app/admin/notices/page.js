'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, status, published_at, cover_image, created_at')
      .eq('category', 'notice')
      .order('created_at', { ascending: false })
    setNotices(data || [])
    setLoading(false)
  }

  async function deleteNotice(id) {
    if (!confirm('このお知らせを削除しますか？')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    setNotices(n => n.filter(x => x.id !== id))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2f2244', margin: 0 }}>お知らせ管理</h1>
        <Link href="/admin/notices/new"
          style={{ background: '#2f2244', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14 }}>
          + 新規作成
        </Link>
      </div>

      {notices.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center', border: '1px solid #e5e5e5' }}>
          <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 20px' }}>お知らせはまだありません</p>
          <Link href="/admin/notices/new" style={{ color: '#2f2244', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #2f2244' }}>最初のお知らせを作成 →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notices.map(n => (
            <div key={n.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: '#f4e8f0', flexShrink: 0 }}>
                {n.cover_image
                  ? <img src={n.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📢</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0d1f3a', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {n.published_at ? new Date(n.published_at).toLocaleDateString('ja-JP') : new Date(n.created_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
              <span style={{ fontSize: 11, background: n.status === 'published' ? '#e8f5e9' : '#f5f5f5', color: n.status === 'published' ? '#388e3c' : '#999', borderRadius: 4, padding: '3px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {n.status === 'published' ? '公開中' : '下書き'}
              </span>
              <Link href={`/admin/notices/${n.id}`}
                style={{ color: '#1a3560', fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                編集
              </Link>
              <button onClick={() => deleteNotice(n.id)}
                style={{ color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
