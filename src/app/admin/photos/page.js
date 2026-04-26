'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function formatDateTime(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    // Mark as viewed
    document.cookie = `photos_last_viewed=${new Date().toISOString()};path=/;max-age=${60 * 60 * 24 * 365}`

    Promise.all([
      fetch('/api/customer/contributed-photos').then(r => r.json()),
      fetch('/api/admin/models').then(r => r.json()).then(d => d.models || []).catch(() => []),
    ]).then(([p, m]) => {
      if (p?.error) { setFetchError(p.error); setLoading(false); return }
      setPhotos(Array.isArray(p) ? p : [])
      setModels(Array.isArray(m) ? m : [])
      setLoading(false)
    })
  }, [])

  const modelMap = Object.fromEntries(models.map(m => [m.id, m.name]))

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
  if (fetchError) return <div style={{ padding: 60, textAlign: 'center', color: '#e53935' }}>エラー: {fetchError}</div>

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin" style={{ color: '#2f2244', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2f2244', margin: '8px 0 24px' }}>📸 ご提供写真</h1>

      {photos.length === 0 ? (
        <p style={{ color: '#999' }}>まだ提供された写真はありません。</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {photos.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
              <div style={{ aspectRatio: '4/3', background: '#f0f4fb', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setExpanded(p)}>
                <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{formatDateTime(p.created_at)}</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                  <span style={{ color: '#999' }}>カメラマン：</span>{p.user_name || p.user_email}
                </div>
                {p.model_ids?.length > 0 && (
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                    <span style={{ color: '#999' }}>モデル：</span>{p.model_ids.map(id => modelMap[id] || id).join('、')}
                  </div>
                )}
                {p.sns_url && (
                  <div style={{ fontSize: 12, marginBottom: 10, wordBreak: 'break-all' }}>
                    <span style={{ color: '#999' }}>SNS：</span>
                    <a href={p.sns_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a3560' }}>{p.sns_url}</a>
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
