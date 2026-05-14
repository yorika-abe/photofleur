'use client'
import { useState } from 'react'

export default function PdfImageSlider({ images }) {
  const [page, setPage] = useState(0)
  if (!images || images.length === 0) return null

  return (
    <div style={{ borderRadius: 10, border: '1px solid #d6ecf5', overflow: 'hidden', background: '#fff' }}>
      <div style={{ position: 'relative', background: '#f0f0f0' }}>
        <img
          src={images[page]}
          alt={`ページ ${page + 1}`}
          style={{ width: '100%', display: 'block', maxHeight: 560, objectFit: 'contain' }}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.3 : 1 }}
            >‹</button>
            <button
              onClick={() => setPage(p => Math.min(images.length - 1, p + 1))}
              disabled={page === images.length - 1}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: page === images.length - 1 ? 'default' : 'pointer', opacity: page === images.length - 1 ? 0.3 : 1 }}
            >›</button>
          </>
        )}
      </div>
      <div style={{ padding: '8px 14px', background: '#f5f9ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#555' }}>
        <span>{page + 1} / {images.length} ページ</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {images.length > 1 && images.map((_, i) => (
            <button key={i} onClick={() => setPage(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', background: i === page ? '#1a3560' : '#ccc', cursor: 'pointer', padding: 0 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
