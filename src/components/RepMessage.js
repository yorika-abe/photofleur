'use client'

import { useState } from 'react'
import Link from 'next/link'
import SectionTitle from './SectionTitle'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

export default function RepMessage({ photo, role, name, message, modelId }) {
  const [expanded, setExpanded] = useState(false)
  const textContent = message?.replace(/<[^>]+>/g, '') || ''
  const hasMore = textContent.length > 100

  return (
    <section style={{ background: '#fff', padding: 'clamp(36px, 5vw, 60px) 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 8 }}>
          <SectionTitle text="MESSAGE" />
        </div>

        <div style={{ display: 'flex', gap: 'clamp(14px, 4vw, 48px)', alignItems: 'flex-start' }}>

          {/* 写真 + ボタン */}
          {photo && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <img src={photo} alt={name || ''}
                style={{ width: 'clamp(80px, 22vw, 160px)', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 10, display: 'block' }} />
              {modelId && (
                <Link href={`/models/${modelId}`}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(10px, 2.5vw, 13px)', color: '#1a3560', textDecoration: 'none', border: '1px solid #1a3560', borderRadius: 6, padding: 'clamp(5px, 1.5vw, 8px) clamp(8px, 2.5vw, 20px)', fontWeight: 600, letterSpacing: '0.03em', width: '100%', boxSizing: 'border-box' }}>
                  モデルページを見る
                </Link>
              )}
            </div>
          )}

          {/* テキスト */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {role && (
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#5bbfd6', textTransform: 'uppercase', margin: '0 0 6px' }}>{role}</p>
            )}
            {name && (
              <h2 style={{ ...serif, fontSize: 'clamp(18px, 4vw, 32px)', fontWeight: 400, color: '#0d1f3a', margin: '0 0 clamp(10px, 2vw, 20px)', lineHeight: 1.2 }}>{name}</h2>
            )}

            {message && (
              <>
                <div
                  style={{
                    fontSize: 14, color: '#555', lineHeight: 2, margin: '0 0 12px',
                    ...(!expanded && hasMore ? { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
                  }}
                  dangerouslySetInnerHTML={{ __html: message }}
                />
                {hasMore && (
                  <button onClick={() => setExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: '#5bbfd6', fontWeight: 600, letterSpacing: '0.05em', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    {expanded ? '閉じる ↑' : 'Read more →'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
