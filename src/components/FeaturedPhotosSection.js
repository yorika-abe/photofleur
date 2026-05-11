'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function FeaturedPhotosSection({ photos, models }) {
  const [page, setPage] = useState(0)
  const [fading, setFading] = useState(false)

  const modelMap = Object.fromEntries((models || []).map(m => [m.id, m]))
  const pairs = []
  for (let i = 0; i < photos.length; i += 2) pairs.push(photos.slice(i, i + 2))
  const totalPages = pairs.length

  useEffect(() => {
    if (totalPages <= 1) return
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setPage(p => (p + 1) % totalPages)
        setFading(false)
      }, 400)
    }, 5000)
    return () => clearInterval(t)
  }, [totalPages])

  function goTo(idx) {
    if (idx === page) return
    setFading(true)
    setTimeout(() => { setPage(idx); setFading(false) }, 400)
  }

  if (photos.length === 0) return null
  const current = pairs[page] || []

  return (
    <section style={{ background: '#f7fbfd', padding: '56px 0 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>

        <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 32, fontWeight: 600, textAlign: 'center' }}>Gallery</p>

        {/* 写真2列 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        >
          {current.map(p => {
            const photoModels = (p.model_ids || []).map(id => modelMap[id]).filter(Boolean)
            return (
              <div key={p.id} style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                {/* 写真：縦横比そのままで高さを合わせる */}
                <div style={{ height: 340, background: '#f0f4fb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img
                    src={p.photo_url}
                    alt=""
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>
                {/* 情報欄 */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{p.display_name || ''}</span>
                    {p.sns_url && (
                      <a href={p.sns_url} target="_blank" rel="noopener noreferrer"
                        style={{ flexShrink: 0, fontSize: 12, padding: '5px 12px', borderRadius: 20, background: '#e8f4f8', color: '#5bbfd6', textDecoration: 'none', fontWeight: 600, border: '1px solid #c3e4ef', whiteSpace: 'nowrap' }}>
                        📸SNS
                      </a>
                    )}
                  </div>
                  {photoModels.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#888' }}>{m.name}</span>
                      <Link href={`/models/${m.id}`}
                        style={{ flexShrink: 0, fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fdf0f7', color: '#f4a0be', textDecoration: 'none', fontWeight: 600, border: '1px solid #f4c8dc', whiteSpace: 'nowrap' }}>
                        MODEL →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {/* 奇数の場合、右側を空白で埋める */}
          {current.length === 1 && <div />}
        </div>

        {/* ページインジケーター */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            {pairs.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: i === page ? 24 : 8, height: 8,
                borderRadius: 4, border: 'none', cursor: 'pointer',
                background: i === page ? '#5bbfd6' : '#c3e4ef',
                transition: 'all 0.3s ease', padding: 0,
              }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
