'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

function formatDateTime(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ModelPhotosPage() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirect=/model-portal/photos'; return }

      const profileRes = await fetch('/api/model-portal/profile')
      if (!profileRes.ok) { setLoading(false); return }
      const { model } = await profileRes.json()
      if (!model) { setLoading(false); return }

      const res = await fetch(`/api/model-portal/photos?model_id=${model.id}`)
      const data = await res.json()
      setPhotos(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <Link href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← モデルポータル</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '12px 0 24px' }}>📸 ご提供いただいた写真</h1>

      {photos.length === 0 ? (
        <p style={{ color: '#999' }}>あなたが写っている提供写真はまだありません。</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {photos.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0ecf8', overflow: 'hidden' }}>
              <div style={{ aspectRatio: '4/3', background: '#f0f4fb', overflow: 'hidden' }}>
                <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>{formatDateTime(p.created_at)}</div>
                {p.sns_url && (
                  <div style={{ fontSize: 12, marginBottom: 10 }}>
                    <a href={p.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560', wordBreak: 'break-all' }}>{p.sns_url}</a>
                  </div>
                )}
                <a href={p.photo_url} download target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', textAlign: 'center', background: '#1a3560', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 700 }}>
                  ダウンロード
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
