'use client'
import { useRef, useEffect } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
function formatDow(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
}

export default function ScheduleCarousel({ events }) {
  const wrapRef = useRef(null)
  const trackRef = useRef(null)
  const isPausedRef = useRef(false)
  const rafRef = useRef(null)

  if (!events || events.length === 0) return null

  const n = events.length
  // Enough copies to fill any screen width
  const looped = [...events, ...events, ...events, ...events, ...events]

  useEffect(() => {
    const wrap = wrapRef.current
    const track = trackRef.current
    if (!wrap || !track) return

    const cards = Array.from(track.querySelectorAll('.s-card'))
    if (!cards.length) return

    const wrapWidth = wrap.clientWidth
    // Spotlight x (relative to wrap left), starts at right edge
    let spotX = wrapWidth
    let lastActive = null
    const speed = 0.8

    function tick() {
      if (!isPausedRef.current) {
        spotX -= speed
        // When spotlight exits left edge, jump back to right edge
        if (spotX < -30) spotX = wrapWidth + 30

        // Find card whose center (relative to wrap) is closest to spotX
        const wrapLeft = wrap.getBoundingClientRect().left
        let best = null, minDist = Infinity
        cards.forEach(card => {
          const rect = card.getBoundingClientRect()
          const center = rect.left + rect.width / 2 - wrapLeft
          const dist = Math.abs(center - spotX)
          if (dist < minDist) { minDist = dist; best = card }
        })

        if (best !== lastActive) {
          if (lastActive) {
            lastActive.style.transform = 'scale(0.85)'
            lastActive.style.opacity = '0.55'
          }
          if (best) {
            best.style.transform = 'scale(1.08)'
            best.style.opacity = '1'
          }
          lastActive = best
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    const pause = () => { isPausedRef.current = true }
    const resume = () => { isPausedRef.current = false }
    const touchResume = () => setTimeout(resume, 1500)

    wrap.addEventListener('mouseenter', pause)
    wrap.addEventListener('mouseleave', resume)
    wrap.addEventListener('touchstart', pause, { passive: true })
    wrap.addEventListener('touchend', touchResume)

    return () => {
      cancelAnimationFrame(rafRef.current)
      wrap.removeEventListener('mouseenter', pause)
      wrap.removeEventListener('mouseleave', resume)
      wrap.removeEventListener('touchstart', pause)
      wrap.removeEventListener('touchend', touchResume)
    }
  }, [n])

  return (
    <div ref={wrapRef} style={{ overflow: 'hidden', padding: '32px 0 56px' }}>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: 20,
          paddingLeft: 'clamp(32px, 12vw, 200px)',
        }}
      >
        {looped.map((ev, i) => {
          const date = formatDate(ev.event_date)
          const dow = formatDow(ev.event_date)
          const isStreet = ev.event_type === 'street'
          const thumbSrc = ev.thumbnail_image || ev.main_image

          return (
            <Link
              key={`${ev.id}-${i}`}
              href={`/events/${ev.id}`}
              className="s-card"
              draggable={false}
              style={{
                flexShrink: 0,
                width: 'clamp(180px, 30vw, 260px)',
                textDecoration: 'none',
                display: 'block',
                transform: 'scale(0.85)',
                opacity: '0.55',
                transition: 'transform 0.4s ease, opacity 0.4s ease',
                position: 'relative',
              }}
            >
              <div style={{ aspectRatio: '4/5', borderRadius: 8, overflow: 'hidden', background: thumbSrc ? '#e8e0f0' : (isStreet ? 'linear-gradient(160deg,#c8e8f5,#a8d8ea)' : 'linear-gradient(160deg,#f4d6e8,#e8b8d0)'), boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                {thumbSrc
                  ? <img src={thumbSrc} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 48, opacity: 0.4 }}>{isStreet ? '🌆' : '🏢'}</span>
                    </div>
                }
              </div>
              <div style={{ padding: '12px 4px 0', textAlign: 'center' }}>
                <div style={{ ...serif, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#0d1f3a', lineHeight: 1, marginBottom: 6 }}>
                  {date}（{dow}）
                </div>
                {ev.title && <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 3 }}>{ev.title}</div>}
                {ev.subtitle && <div style={{ fontSize: 11, color: '#888' }}>{ev.subtitle}</div>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
