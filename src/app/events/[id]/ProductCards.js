'use client'
import { useState } from 'react'

export default function ProductCards({ products }) {
  const [selected, setSelected] = useState(null)

  if (!products || products.length === 0) return null

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#333', marginBottom: 16 }}>予約商品</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div key={p.id}
              onClick={() => setSelected(p)}
              style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}>
              {p.image && (
                <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#333', marginBottom: 4 }}>{p.name}</div>
                {p.available_slots?.length > 0 && (
                  <div style={{ fontSize: 11, color: '#5bbfd6', fontWeight: 600, marginBottom: 6 }}>
                    🕐 {p.available_slots.join(' / ')}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>¥{(p.price || 0).toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: p.stock > 0 ? '#999' : '#e53935', fontWeight: p.stock <= 0 ? 700 : 400 }}>
                    {p.stock <= 0 ? '在庫なし' : `在庫 ${p.stock}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* モーダル */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, maxWidth: 480, width: '100%', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
            {selected.image && (
              <img src={selected.image} alt={selected.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
            )}
            <div style={{ padding: '24px 24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3560', marginBottom: 8 }}>{selected.name}</div>
              {selected.available_slots?.length > 0 && (
                <div style={{ fontSize: 13, color: '#5bbfd6', fontWeight: 600, marginBottom: 12 }}>
                  🕐 {selected.available_slots.join(' / ')}
                </div>
              )}
              {selected.description && (
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{selected.description}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#1a3560' }}>¥{(selected.price || 0).toLocaleString()}</span>
                <span style={{ fontSize: 13, color: selected.stock <= 0 ? '#e53935' : '#888', fontWeight: selected.stock <= 0 ? 700 : 400 }}>
                  {selected.stock <= 0 ? '在庫なし' : `在庫 ${selected.stock}件`}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 12 }}>ご予約後、当日スタッフまでお申し付けください。</p>
              <button onClick={() => setSelected(null)}
                style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ddd', background: '#f5f5f5', color: '#555', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
