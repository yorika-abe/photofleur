'use client'

import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function isVideo(url) {
  return /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url)
}

function MediaItem({ url }) {
  return (
    <div style={{ width: 320, height: 240, flexShrink: 0, borderRadius: 12, overflow: 'hidden' }}>
      {isVideo(url) ? (
        <video src={url} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  )
}

function MarqueeRow({ items, direction }) {
  if (items.length === 0) return null
  const filled = []
  while (filled.length < 10) filled.push(...items)
  const track = [...filled, ...filled]

  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <div style={{
        display: 'flex',
        gap: 12,
        width: 'max-content',
        animation: `recruit-marquee-${direction} 30s linear infinite`,
      }}>
        {track.map((url, i) => <MediaItem key={i} url={url} />)}
      </div>
    </div>
  )
}

export default function RecruitMarquee({ items }) {
  const hasItems = items.length > 0

  // Split into two groups so top and bottom show different images
  const topItems = items.filter((_, i) => i % 2 === 0)
  const bottomItems = items.filter((_, i) => i % 2 === 1)
  const actualTop = topItems.length > 0 ? topItems : items
  const actualBottom = bottomItems.length > 0 ? bottomItems : [...items].reverse()

  return (
    <section style={{ background: '#fafcff', overflow: 'hidden' }}>

      {hasItems && (
        <div style={{ paddingTop: 60 }}>
          <MarqueeRow items={actualTop} direction="left" />
        </div>
      )}

      {/* Text block */}
      <div style={{ textAlign: 'center', padding: hasItems ? '64px 20px' : '120px 20px' }}>
        <p style={{
          ...serif, fontSize: 11, letterSpacing: '0.35em', color: '#f4a0be',
          textTransform: 'uppercase', marginBottom: 16, fontStyle: 'italic',
        }}>Join us</p>

        <h2 style={{
          ...serif, fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 300,
          color: '#0d1f3a', lineHeight: 1.35, margin: '0 0 20px',
        }}>
          モデルとして<br />
          <em style={{ color: '#5bbfd6', fontStyle: 'italic' }}>PhotoFleurの一員になりませんか？</em>
        </h2>

        <div style={{ width: 40, height: 1, background: '#d6ecf5', margin: '0 auto 24px' }} />

        <p style={{ fontSize: 14, color: '#778', lineHeight: 2.1, marginBottom: 36 }}>
          完全女性運営によるサポートのもと<br />
          あなたのモデル活動を全力で応援いたします。<br />
          経験不問。公式LINEからお気軽にご連絡ください。
        </p>

        <Link href="/model-recruit" style={{
          ...serif, display: 'inline-block', fontSize: 13, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#1a3560', textDecoration: 'none',
          border: '1.5px solid #1a3560', padding: '14px 48px', borderRadius: 2,
          transition: 'all 0.2s',
        }}>
          詳しく見る →
        </Link>
      </div>

      {hasItems && (
        <div style={{ paddingBottom: 60 }}>
          <MarqueeRow items={actualBottom} direction="right" />
        </div>
      )}

      <style>{`
        @keyframes recruit-marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes recruit-marquee-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  )
}
