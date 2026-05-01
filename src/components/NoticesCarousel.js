'use client'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export default function NoticesCarousel({ notices }) {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const isPausedRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const handleScroll = () => {
      const center = track.scrollLeft + track.clientWidth / 2
      const cards = track.querySelectorAll('.n-card')
      let closest = 0
      let minDist = Infinity
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2
        const dist = Math.abs(center - cardCenter)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      activeIndexRef.current = closest
      setActiveIndex(closest)
    }
    track.addEventListener('scroll', handleScroll, { passive: true })
    track.addEventListener('mouseenter', () => { isPausedRef.current = true })
    track.addEventListener('mouseleave', () => { isPausedRef.current = false })
    track.addEventListener('touchstart', () => { isPausedRef.current = true })
    track.addEventListener('touchend', () => { setTimeout(() => { isPausedRef.current = false }, 2000) })
    setTimeout(() => {
      const cards = track.querySelectorAll('.n-card')
      if (cards.length > 0) {
        const card = cards[0]
        track.scrollLeft = card.offsetWidth * 0 - (track.clientWidth - card.offsetWidth) / 2
        handleScroll()
      }
    }, 50)

    const interval = setInterval(() => {
      if (isPausedRef.current) return
      const t = trackRef.current
      if (!t) return
      const cards = t.querySelectorAll('.n-card')
      if (!cards.length) return
      const nextIndex = (activeIndexRef.current + 1) % cards.length
      const card = cards[nextIndex]
      t.scrollTo({ left: card.offsetLeft - (t.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
    }, 4000)

    return () => {
      track.removeEventListener('scroll', handleScroll)
      clearInterval(interval)
    }
  }, [])

  if (!notices || notices.length === 0) return null

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          overflowX: 'scroll',
          scrollSnapType: 'x mandatory',
          gap: 20,
          padding: '32px clamp(32px, 12vw, 200px) 48px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          alignItems: 'center',
        }}
      >
        {notices.map((notice, i) => {
          const isActive = i === activeIndex
          const preview = stripHtml(notice.content).slice(0, 80)

          return (
            <Link
              key={notice.id}
              href={`/blog/${notice.slug}`}
              className="n-card"
              style={{
                flexShrink: 0,
                width: 'clamp(220px, 48vw, 300px)',
                scrollSnapAlign: 'center',
                textDecoration: 'none',
                display: 'block',
                transform: isActive ? 'scale(1.08)' : 'scale(0.88)',
                transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
                zIndex: isActive ? 2 : 1,
                position: 'relative',
                opacity: isActive ? 1 : 0.72,
              }}
            >
              <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3/4', background: '#f4e8f0', borderRadius: 6, boxShadow: isActive ? '0 16px 48px rgba(0,0,0,0.28)' : '0 4px 12px rgba(0,0,0,0.12)' }}>
                {notice.cover_image
                  ? <img src={notice.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#fce8f0,#e8f4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 48, opacity: 0.4 }}>📢</span>
                    </div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,25,50,0.88) 0%, rgba(10,25,50,0.05) 55%, transparent 100%)' }} />
                <div style={{ position: 'absolute', top: 14, left: 14 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.2em', color: '#fff', textTransform: 'uppercase', background: 'rgba(244,160,190,0.75)', padding: '3px 8px', borderRadius: 2, fontWeight: 600 }}>
                    Notice
                  </span>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px' }}>
                  {notice.published_at && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{formatDate(notice.published_at)}</div>
                  )}
                  <div style={{ ...serif, fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 600, color: '#fff', lineHeight: 1.4, marginBottom: 8 }}>
                    {notice.title}
                  </div>
                  {preview && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {preview}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      <style>{`div::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}
