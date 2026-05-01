'use client'
import { useState } from 'react'

function isVideo(url) {
  if (!url) return false
  const ext = url.split('?')[0].split('.').pop().toLowerCase()
  return ['mp4', 'mov', 'webm', 'avi'].includes(ext)
}

function MediaThumb({ url, style }) {
  if (isVideo(url)) {
    return (
      <div style={{ ...style, position: 'relative' }}>
        <video src={url} muted loop playsInline style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, marginLeft: 3 }}>▶</span>
          </div>
        </div>
      </div>
    )
  }
  return <img src={url} alt="" style={{ ...style, objectFit: 'cover' }} />
}

export default function PortfolioSlider({ images }) {
  const [lightbox, setLightbox] = useState(null)

  if (!images || images.length === 0) return null

  const prev = () => setLightbox(i => (i - 1 + images.length) % images.length)
  const next = () => setLightbox(i => (i + 1) % images.length)

  return (
    <div style={{ marginTop: 56 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>Portfolio</p>

      <div style={{ columns: '2', gap: 4 }}>
        {images.map((url, i) => (
          <div
            key={i}
            onClick={() => setLightbox(i)}
            style={{ breakInside: 'avoid', marginBottom: 4, cursor: 'pointer', overflow: 'hidden', background: '#e8e0f0' }}
            className="pf-item"
          >
            <MediaThumb url={url} style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform 0.4s ease' }} />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightbox(null)}
        >
          <button onClick={e => { e.stopPropagation(); prev() }}
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 48, height: 48, borderRadius: '50%', fontSize: 24, cursor: 'pointer', zIndex: 1 }}>‹</button>

          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '92vw', maxHeight: '92vh' }}>
            {isVideo(images[lightbox])
              ? <video src={images[lightbox]} controls autoPlay style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 4 }} />
              : <img src={images[lightbox]} alt="" style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 4 }} />
            }
          </div>

          <button onClick={e => { e.stopPropagation(); next() }}
            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 48, height: 48, borderRadius: '50%', fontSize: 24, cursor: 'pointer', zIndex: 1 }}>›</button>

          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>✕</button>

          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            {lightbox + 1} / {images.length}
          </div>
        </div>
      )}

      <style>{`.pf-item:hover img, .pf-item:hover video { transform: scale(1.04); }`}</style>
    </div>
  )
}
