'use client'
import { useState } from 'react'

export default function PortfolioSlider({ images }) {
  const [current, setCurrent] = useState(0)

  if (!images || images.length === 0) return null

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length)
  const next = () => setCurrent(i => (i + 1) % images.length)

  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2f2244', marginBottom: 20 }}>ポートフォリオ</h2>

      {/* Main image */}
      <div style={{ position: 'relative', aspectRatio: '3/4', maxWidth: 480, margin: '0 auto', background: '#e0d8f0', borderRadius: 12, overflow: 'hidden' }}>
        <img
          src={images[current]}
          alt={`portfolio ${current + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s ease' }}
        />

        {images.length > 1 && (
          <>
            <button onClick={prev} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%',
              width: 40, height: 40, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <button onClick={next} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%',
              width: 40, height: 40, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>

            <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {images.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} style={{
                  width: i === current ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer',
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.4)',
                  padding: 0, transition: 'all 0.2s ease',
                }} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Counter */}
      {images.length > 1 && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 12 }}>
          {current + 1} / {images.length}
        </p>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {images.map((img, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              flexShrink: 0, width: 64, height: 80, borderRadius: 6, overflow: 'hidden',
              border: i === current ? '2px solid #2f2244' : '2px solid transparent',
              padding: 0, cursor: 'pointer', background: '#e0d8f0',
            }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
