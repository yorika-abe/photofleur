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

  if (!events || events.length === 0) return null

  const n = events.length
  const looped = [...events, ...events, ...events]

  useEffect(() => {
    const wrap = wrapRef.current
    const track = trackRef.current
    if (!wrap || !track) return

    const cards = Array.from(track.querySelectorAll('.s-card'))
    if (!cards.length) return

    const cardW = cards[0].offsetWidth
    const gap = 20
    const wrapW = wrap.clientWidth

    let idx = n // start at center of middle set
    let isJumping = false

    function offset(i) {
      return -(i * (cardW + gap) + cardW / 2 - wrapW / 2)
    }

    function applyStyles(i) {
      cards.forEach((card, j) => {
        const dist = Math.abs(j - i)
        if (dist === 0) {
          card.style.transform = 'scale(1.4)'
          card.style.opacity = '1'
          card.style.zIndex = '3'
        } else if (dist === 1) {
          card.style.transform = 'scale(0.88)'
          card.style.opacity = '0.75'
          card.style.zIndex = '2'
        } else {
          card.style.transform = 'scale(0.72)'
          card.style.opacity = '0.45'
          card.style.zIndex = '1'
        }
      })
    }

    function goTo(i, animate) {
      track.style.transition = animate
        ? 'transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94)'
        : 'none'
      track.style.transform = `translateX(${offset(i)}px)`
      applyStyles(i)
    }

    // Set initial position immediately (no animation)
    goTo(idx, false)

    const interval = setInterval(() => {
      if (isPausedRef.current || isJumping) return
      idx++
      goTo(idx, true)

      // Seamless loop: after transition, silently jump back one set if needed
      if (idx >= n * 2) {
        isJumping = true
        setTimeout(() => {
          idx -= n
          goTo(idx, false)
          isJumping = false
        }, 700)
      }
    }, 3500)

    const pause = () => { isPausedRef.current = true }
    const resume = () => { isPausedRef.current = false }
    const touchResume = () => setTimeout(resume, 2000)

    wrap.addEventListener('mouseenter', pause)
    wrap.addEventListener('mouseleave', resume)
    wrap.addEventListener('touchstart', pause, { passive: true })
    wrap.addEventListener('touchend', touchResume)

    return () => {
      clearInterval(interval)
      wrap.removeEventListener('mouseenter', pause)
      wrap.removeEventListener('mouseleave', resume)
      wrap.removeEventListener('touchstart', pause)
      wrap.removeEventListener('touchend', touchResume)
    }
  }, [n])

  return (
    <div ref={wrapRef} style={{ overflow: 'hidden', padding: '40px 0 60px' }}>
      <div
        ref={trackRef}
        style={{ display: 'flex', gap: 20, willChange: 'transform' }}
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
                width: 'clamp(160px, 28vw, 240px)',
                textDecoration: 'none',
                display: 'block',
                transform: 'scale(0.72)',
                opacity: '0.45',
                transition: 'transform 0.4s ease, opacity 0.4s ease',
                position: 'relative',
              }}
            >
              <div style={{
                aspectRatio: '4/5',
                borderRadius: 10,
                overflow: 'hidden',
                background: thumbSrc ? '#e8e0f0' : (isStreet ? 'linear-gradient(160deg,#c8e8f5,#a8d8ea)' : 'linear-gradient(160deg,#f4d6e8,#e8b8d0)'),
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              }}>
                {thumbSrc
                  ? <img src={thumbSrc} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 48, opacity: 0.4 }}>{isStreet ? '🌆' : '🏢'}</span>
                    </div>
                }
              </div>
              <div style={{ padding: '12px 4px 0', textAlign: 'center' }}>
                <div style={{ ...serif, fontSize: 'clamp(18px, 3.5vw, 26px)', fontWeight: 700, color: '#0d1f3a', lineHeight: 1, marginBottom: 6 }}>
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
