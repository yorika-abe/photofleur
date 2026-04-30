'use client'

import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function isVideo(url) {
  return /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url)
}

function MediaItem({ url }) {
  return (
    <div style={{ width: 280, height: 190, flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
      {isVideo(url) ? (
        <video src={url} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  )
}

function MarqueeRow({ items, direction }) {
  const filled = []
  while (filled.length < 10) filled.push(...items)
  const track = [...filled, ...filled]

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        gap: 12,
        width: 'max-content',
        animation: `recruit-marquee-${direction} 35s linear infinite`,
      }}>
        {track.map((url, i) => <MediaItem key={i} url={url} />)}
      </div>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to right, #fff 0%, transparent 12%, transparent 88%, #fff 100%)',
      }} />
    </div>
  )
}

export default function RecruitMarquee({ items }) {
  const hasItems = items.length > 0

  return (
    <section style={{ background: '#fff', padding: hasItems ? '60px 0' : '120px 20px' }}>
      {hasItems && <MarqueeRow items={items} direction="left" />}

      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ ...serif, fontSize: 12, letterSpacing: '0.3em', color: '#f4a0be', textTransform: 'uppercase', marginBottom: 20, fontStyle: 'italic' }}>Join us</p>
        <h2 style={{ ...serif, fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 300, color: '#0d1f3a', lineHeight: 1.3, margin: '0 0 24px' }}>
          モデルとして<br />
          <em style={{ color: '#5bbfd6' }}>PhotoFleurの一員になりませんか？</em>
        </h2>
        <p style={{ fontSize: 15, color: '#667', lineHeight: 2, marginBottom: 40 }}>
          完全女性運営によるサポートのもと<br />
          あなたのモデル活動を全力で応援いたします。<br />
          経験不問。公式LINEからお気軽にご連絡ください。
        </p>
        <Link href="/model-recruit" style={{
          ...serif, display: 'inline-block', fontSize: 14, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#fff', textDecoration: 'none',
          background: '#1a3560', padding: '16px 48px', borderRadius: 2,
        }}>
          詳しく見る →
        </Link>
      </div>

      {hasItems && <MarqueeRow items={items} direction="right" />}

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
