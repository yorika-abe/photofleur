'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

async function downloadPhoto(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  const ext = blob.type.split('/')[1] || 'jpg'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `photo_${Date.now()}.${ext}`
  a.click()
  URL.revokeObjectURL(a.href)
}

function formatDateTime(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PhotoCard({ p, onExpand }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
      <div style={{ aspectRatio: '4/3', background: '#f0f4fb', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => onExpand(p)}>
        <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{formatDateTime(p.created_at)}</div>
        {(p.user_name || p.user_email) && (
          <div style={{ fontSize: 12, color: '#1a3560', fontWeight: 600, marginBottom: 6 }}>
            📷 {p.user_name || p.user_email}
          </div>
        )}
        {p.sns_url && (
          <div style={{ fontSize: 12, marginBottom: 6, wordBreak: 'break-all' }}>
            <span style={{ color: '#999' }}>SNS：</span>
            <a href={p.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560' }}>{p.sns_url}</a>
          </div>
        )}
        <button onClick={() => downloadPhoto(p.photo_url)}
          style={{ display: 'block', width: '100%', textAlign: 'center', background: '#1a3560', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          ダウンロード
        </button>
      </div>
    </div>
  )
}

export default function ModelPhotosPage() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [lastViewed, setLastViewed] = useState(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    const prev = document.cookie.split('; ').find(r => r.startsWith('model_photos_last_viewed='))?.split('=')[1]
    setLastViewed(prev || null)
    document.cookie = `model_photos_last_viewed=${new Date().toISOString()};path=/;max-age=${60 * 60 * 24 * 365}`

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

  const newPhotos = lastViewed
    ? photos.filter(p => new Date(p.created_at) > new Date(lastViewed))
    : photos
  const seenPhotos = lastViewed
    ? photos.filter(p => new Date(p.created_at) <= new Date(lastViewed))
    : []

  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px' }}>
      <style>{`@media (max-width: 640px) { .mp-photos-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; } }`}</style>
      <Link href="/model-portal" style={{ color: '#1a3560', fontSize: 13, textDecoration: 'none' }}>← モデルポータル</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3560', margin: '12px 0 8px' }}>📸 ご提供いただいた写真</h1>
      <p style={{ fontSize: 12, color: '#aaa', marginBottom: 24 }}>※ご提供から2ヶ月で自動消去されます</p>

      {photos.length === 0 ? (
        <p style={{ color: '#999' }}>あなたが写っている提供写真はまだありません。</p>
      ) : (
        <>
          {newPhotos.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1a3560', letterSpacing: '0.08em', marginBottom: 12 }}>
                新着 {newPhotos.length}件
              </p>
              <div className="mp-photos-grid" style={grid}>
                {newPhotos.map(p => <PhotoCard key={p.id} p={p} onExpand={setExpanded} />)}
              </div>
            </div>
          )}
          {newPhotos.length === 0 && (
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>新着はありません。</p>
          )}
          {seenPhotos.length > 0 && (
            <div>
              <button onClick={() => setShowAll(v => !v)}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: '#555', cursor: 'pointer', fontWeight: 600, marginBottom: 16 }}>
                {showAll ? '▲ 閉じる' : `▼ 全て見る（${seenPhotos.length}件）`}
              </button>
              {showAll && (
                <div className="mp-photos-grid" style={grid}>
                  {seenPhotos.map(p => <PhotoCard key={p.id} p={p} onExpand={setExpanded} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {expanded && (
        <div onClick={() => setExpanded(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={expanded.photo_url} alt=""
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setExpanded(null)}
            style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
      )}
    </div>
  )
}
