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
          padding: '32px clamp(32px, 12vw, 200px) 48px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          alignItems: 'center',
        }}
      >
        {events.map((ev, i) => {
          const date = formatDate(ev.event_date)
          const modelList = (ev.event_entries || []).map(e => e.models).filter(Boolean)
          const isStreet = ev.event_type === 'street'
          const isActive = i === activeIndex

          return (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="s-card"
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
              <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3/4', background: '#d6ecf5', borderRadius: 6, boxShadow: isActive ? '0 16px 48px rgba(0,0,0,0.28)' : '0 4px 12px rgba(0,0,0,0.12)' }}>
                {ev.main_image
                  ? <img src={ev.main_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: isStreet ? 'linear-gradient(160deg,#c8e8f5,#a8d8ea)' : 'linear-gradient(160deg,#f4d6e8,#e8b8d0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 48, opacity: 0.4 }}>{isStreet ? '🌆' : '🏢'}</span>
                    </div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,25,50,0.85) 0%, rgba(10,25,50,0.05) 55%, transparent 100%)' }} />

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px' }}>
                  <div style={{ ...serif, fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 400, color: '#fff', lineHeight: 1, marginBottom: 8, letterSpacing: '0.02em' }}>
                    {date}
                  </div>
                  {ev.title && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{ev.title}</div>
                  )}
                  {ev.location_name && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>{ev.location_name}</div>
                  )}
                  {modelList.length > 0 && (
                    <div style={{ display: 'flex' }}>
                      {modelList.slice(0, 4).map((m, idx) => (
                        <div key={idx} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.6)', overflow: 'hidden', background: '#d6ecf5', marginLeft: idx > 0 ? -7 : 0 }}>
                          {m.image && <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                      ))}
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
