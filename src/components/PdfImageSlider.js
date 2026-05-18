'use client'
import { useState, useRef } from 'react'

export default function PdfImageSlider({ images }) {
  const [page, setPage] = useState(0)
  const touchStartX = useRef(null)

  if (!images || images.length === 0) return null

  const btnStyle = (disabled) => ({
    background: 'none', border: '1px solid #ccc', borderRadius: '50%', width: 32, height: 32,
    fontSize: 16, cursor: disabled ? 'default' : 'pointer', color: disabled ? '#ccc' : '#1a3560',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0,
  })

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) setPage(p => Math.min(images.length - 1, p + 1))
    else setPage(p => Math.max(0, p - 1))
  }

  return (
    <div style={{ borderRadius: 10, border: '1px solid #d6ecf5', overflow: 'hidden', background: '#fff' }}>
      <div
        style={{ background: '#f0f0f0', touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[page]}
          alt={`ページ ${page + 1}`}
          style={{ width: '100%', display: 'block', maxHeight: 560, objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
        />
      </div>
      <div style={{ padding: '8px 14px', background: '#f5f9ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#555', gap: 8, flexWrap: 'nowrap' }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={btnStyle(page === 0)}>‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{page + 1} / {images.length}</span>
          {images.length > 1 && images.length <= 20 && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap', overflow: 'hidden' }}>
              {images.map((_, i) => (
                <button key={i} onClick={() => setPage(i)} style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', background: i === page ? '#1a3560' : '#ccc', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setPage(p => Math.min(images.length - 1, p + 1))} disabled={page === images.length - 1} style={btnStyle(page === images.length - 1)}>›</button>
      </div>
    </div>
  )
}
