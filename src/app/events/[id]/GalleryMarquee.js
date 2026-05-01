'use client'

export default function GalleryMarquee({ images }) {
  if (!images || images.length === 0) return null

  const doubled = [...images, ...images]

  return (
    <div style={{ marginBottom: 40, overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .gallery-track {
          display: flex;
          gap: 8px;
          width: max-content;
          animation: marquee ${images.length * 3}s linear infinite;
        }
      `}</style>
      <div className="gallery-track">
        {doubled.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            style={{ height: 260, width: 'auto', objectFit: 'cover', borderRadius: 10, flexShrink: 0, display: 'block' }}
          />
        ))}
      </div>
    </div>
  )
}
