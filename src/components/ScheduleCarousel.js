'use client'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

function formatDow(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
}

export default function ScheduleCarousel({ events }) {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const isPausedRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const handleScroll = () => {
      const center = track.scrollLeft + track.clientWidth / 2
      const cards = track.querySelectorAll('.s-card')
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
      const cards = track.querySelectorAll('.s-card')
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
      const cards = t.querySelectorAll('.s-card')
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

  if (!events || events.length === 0) return null

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          overflowX: 'scroll',
          scrollSnapType: 'x mandatory',
          gap: 20,
          padding: '32px clamp(32px, 12vw, 200px) 56px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          alignItems: 'flex-start',
        }}
      >
        {events.map((ev, i) => {
          const date = formatDate(ev.event_date)
          const dow = formatDow(ev.event_date)
          const isStreet = ev.event_type === 'street'
          const isActive = i === activeIndex
          const thumbSrc = ev.thumbnail_image || ev.main_image

          return (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="s-card"
              style={{
                flexShrink: 0,
                width: 'clamp(180px, 40vw, 240px)',
                scrollSnapAlign: 'center',
                textDecoration: 'none',
                display: 'block',
                transform: isActive ? 'scale(1.06)' : 'scale(0.88)',
                transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
                zIndex: isActive ? 2 : 1,
                position: 'relative',
                opacity: isActive ? 1 : 0.65,
              }}
            >
              {/* 4:5 image, no overlay */}
              <div style={{ aspectRatio: '4/5', borderRadius: 8, overflow: 'hidden', background: thumbSrc ? '#e8e0f0' : (isStreet ? 'linear-gradient(160deg,#c8e8f5,#a8d8ea)' : 'linear-gradient(160deg,#f4d6e8,#e8b8d0)'), boxShadow: isActive ? '0 16px 48px rgba(0,0,0,0.22)' : '0 4px 12px rgba(0,0,0,0.1)' }}>
                {thumbSrc
                  ? <img src={thumbSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 48, opacity: 0.4 }}>{isStreet ? '🌆' : '🏢'}</span>
                    </div>
                }
              </div>

              {/* text below image, centered */}
              <div style={{ padding: '12px 4px 0', textAlign: 'center' }}>
                <div style={{ ...serif, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#0d1f3a', lineHeight: 1, marginBottom: 6, letterSpacing: '0.02em' }}>
                  {date}（{dow}）
                </div>
                {ev.title && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 3 }}>{ev.title}</div>
                )}
                {ev.subtitle && (
                  <div style={{ fontSize: 11, color: '#888' }}>{ev.subtitle}</div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
      <style>{`div::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}
