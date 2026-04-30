'use client'

import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function isVideo(url) {
  return /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url)
}

// Fixed height, auto width — no cropping regardless of portrait/landscape
function MediaItem({ url }) {
  const ROW_HEIGHT = 220
  return (
    <div style={{ height: ROW_HEIGHT, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#f0f0f0' }}>
      {isVideo(url) ? (
        <video src={url} autoPlay muted loop playsInline
          style={{ height: '100%', width: 'auto', display: 'block' }} />
      ) : (
        <img src={url} alt=""
          style={{ height: '100%', width: 'auto', display: 'block' }} />
      )}
    </div>
  )
}

function MarqueeRow({ items, direction }) {
  if (!items || items.length === 0) return null
  const filled = []
  while (filled.length < 10) filled.push(...items)
  const track = [...filled, ...filled]

  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <div style={{
        display: 'flex',
        gap: 10,
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

  const topItems = items.filter((_, i) => i % 2 === 0)
  const bottomItems = items.filter((_, i) => i % 2 === 1)
  const actualTop = topItems.length > 0 ? topItems : items
  const actualBottom = bottomItems.length > 0 ? bottomItems : [...items].reverse()

  return (
    <section style={{ background: '#fafcff', overflow: 'hidden', padding: '48px 0' }}>

      {hasItems && <MarqueeRow items={actualTop} direction="left" />}

      {/* Text */}
      <div style={{ textAlign: 'center', padding: '28px 20px 24px' }}>
        <p style={{
          ...serif, fontSize: 10, letterSpacing: '0.35em', color: '#f4a0be',
          textTransform: 'uppercase', marginBottom: 8, fontStyle: 'italic',
        }}>Join us</p>

        <h2 style={{
          ...serif, fontSize: 'clamp(22px, 3.5vw, 44px)', fontWeight: 300,
          color: '#0d1f3a', lineHeight: 1.3, margin: '0 0 10px',
        }}>
          モデルとして<br />
          <em style={{ color: '#5bbfd6', fontStyle: 'italic' }}>PhotoFleurの一員になりませんか？</em>
        </h2>

        <p style={{ fontSize: 12, color: '#778', lineHeight: 1.9, marginBottom: 18 }}>
          完全女性運営によるサポートのもと
          あなたのモデル活動を全力で応援いたします。
          経験不問。公式LINEからお気軽にご連絡ください。
        </p>

        <Link href="/model-recruit" style={{
          ...serif, display: 'inline-block', fontSize: 11, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#1a3560', textDecoration: 'none',
          border: '1.5px solid #1a3560', padding: '10px 36px', borderRadius: 2,
        }}>
          詳しく見る →
        </Link>
      </div>

      {hasItems && <MarqueeRow items={actualBottom} direction="right" />}

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
