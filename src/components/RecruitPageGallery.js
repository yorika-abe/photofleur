'use client'

function isVideo(url) {
  return /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url)
}

function MediaItem({ url }) {
  return (
    <div className="rpg-item" style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#f0f0f0' }}>
      {isVideo(url) ? (
        <video src={url} autoPlay muted loop playsInline style={{ height: '100%', width: 'auto', display: 'block' }} />
      ) : (
        <img src={url} alt="" style={{ height: '100%', width: 'auto', display: 'block' }} />
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
      <div style={{ display: 'flex', gap: 10, width: 'max-content', animation: `rpg-${direction} 30s linear infinite` }}>
        {track.map((url, i) => <MediaItem key={i} url={url} />)}
      </div>
    </div>
  )
}

export default function RecruitPageGallery({ items }) {
  if (!items || items.length === 0) return null

  const top = items.filter((_, i) => i % 2 === 0)
  const bottom = items.filter((_, i) => i % 2 === 1)
  const actualTop = top.length > 0 ? top : items
  const actualBottom = bottom.length > 0 ? bottom : [...items].reverse()

  return (
    <section style={{ background: '#fff', overflow: 'hidden', padding: '32px 0' }}>
      <MarqueeRow items={actualTop} direction="left" />
      <div style={{ height: 10 }} />
      <MarqueeRow items={actualBottom} direction="right" />
      <style>{`
        .rpg-item { height: 220px; }
        @media (max-width: 640px) { .rpg-item { height: 110px; } }
        @keyframes rpg-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes rpg-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
      `}</style>
    </section>
  )
}
