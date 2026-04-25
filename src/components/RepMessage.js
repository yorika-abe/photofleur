'use client'

import { useState } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

export default function RepMessage({ photo, role, name, message, modelId }) {
  const [expanded, setExpanded] = useState(false)
  const preview = message?.slice(0, 100) || ''
  const hasMore = message?.length > 100

  return (
    <section style={{ background: '#fff', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <p style={{ ...serif, fontSize: 11, letterSpacing: '0.3em', color: '#5bbfd6', textTransform: 'uppercase', marginBottom: 32, fontStyle: 'italic', textAlign: 'center' }}>Message</p>

        <div style={{ display: 'flex', gap: 'clamp(24px, 4vw, 48px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* 写真 */}
          {photo && (
            <div style={{ flexShrink: 0 }}>
              <img src={photo} alt={name || ''}
                style={{ width: 'clamp(100px, 18vw, 160px)', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 12, display: 'block' }} />
            </div>
          )}

          {/* テキスト */}
          <div style={{ flex: 1, minWidth: 220 }}>
            {role && (
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#5bbfd6', textTransform: 'uppercase', margin: '0 0 6px' }}>{role}</p>
            )}
            {name && (
              <h2 style={{ ...serif, fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 400, color: '#0d1f3a', margin: '0 0 20px', lineHeight: 1.2 }}>{name}</h2>
            )}

            {message && (
              <>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 2, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>
                  {expanded ? message : (hasMore ? preview + '…' : message)}
                </p>
                {hasMore && (
                  <button onClick={() => setExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: '#5bbfd6', fontWeight: 600, letterSpacing: '0.05em', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    {expanded ? '閉じる ↑' : 'Read more →'}
                  </button>
                )}
              </>
            )}

            {modelId && (
              <div style={{ marginTop: 24 }}>
                <Link href={`/models/${modelId}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1a3560', textDecoration: 'none', border: '1px solid #1a3560', borderRadius: 6, padding: '8px 20px', fontWeight: 600, letterSpacing: '0.05em' }}>
                  モデルページを見る →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
