'use client'

import Link from 'next/link'

export default function FeaturedPhotosSection({ photos, models }) {
  if (!photos || photos.length === 0) return null

  const modelMap = Object.fromEntries((models || []).map(m => [m.id, m]))

  return (
    <section style={{ background: '#f7fbfd', padding: '56px 0 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 32, fontWeight: 600, textAlign: 'center' }}>Gallery</p>

        <div style={{ columns: 2, columnGap: 16 }}>
          {photos.map(p => {
            const photoModels = (p.model_ids || []).map(id => modelMap[id]).filter(Boolean)
            return (
              <div key={p.id} style={{ breakInside: 'avoid', marginBottom: 16, borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <img src={p.photo_url} alt="" style={{ width: '100%', display: 'block' }} />
                {(p.display_name || p.sns_url || photoModels.length > 0) && (
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
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
