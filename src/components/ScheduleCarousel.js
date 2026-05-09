'use client'
import { useRef, useEffect, useState } from 'react'
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
  const trackRef = useRef(null)
  const [activeReal, setActiveReal] = useState(0)
  const isPausedRef = useRef(false)
  const rafRef = useRef(null)

  if (!events || events.length === 0) return null

  const n = events.length
  const looped = [...events, ...events, ...events]

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    // Width of one full set of cards (from card[0].offsetLeft to card[n].offsetLeft)
    function getOneSetWidth() {
      const cards = track.querySelectorAll('.s-card')
      if (cards.length <= n) return 0
      return cards[n].offsetLeft - cards[0].offsetLeft
    }

    // Active = second card whose center is visible from the left
    function updateActive() {
      const cards = track.querySelectorAll('.s-card')
      const viewLeft = track.scrollLeft
      const viewRight = viewLeft + track.clientWidth
      const visible = []
      cards.forEach((card, i) => {
        const center = card.offsetLeft + card.offsetWidth / 2
        if (center > viewLeft && center < viewRight) {
          visible.push({ realI: i % n, center })
        }
      })
      visible.sort((a, b) => a.center - b.center)
      if (visible[1]) setActiveReal(visible[1].realI)
      else if (visible[0]) setActiveReal(visible[0].realI)
    }

    // Start at beginning of second copy so we have room to loop in both directions
    let oneSetWidth = 0
    setTimeout(() => {
      oneSetWidth = getOneSetWidth()
      if (oneSetWidth > 0) track.scrollLeft = oneSetWidth
      updateActive()
    }, 100)

    const speed = 0.7 // px per frame (~42px/s at 60fps)

    function tick() {
      if (!isPausedRef.current) {
        oneSetWidth = oneSetWidth || getOneSetWidth()
        track.scrollLeft += speed

        // Seamless loop: when past second set, jump back by one set
        if (oneSetWidth > 0 && track.scrollLeft >= oneSetWidth * 2) {
          track.scrollLeft -= oneSetWidth
        }

        updateActive()
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    const pause = () => { isPausedRef.current = true }
    const resume = () => { isPausedRef.current = false }
    const touchResume = () => setTimeout(resume, 1500)

    track.addEventListener('mouseenter', pause)
    track.addEventListener('mouseleave', resume)
    track.addEventListener('touchstart', pause, { passive: true })
    track.addEventListener('touchend', touchResume)

    return () => {
      cancelAnimationFrame(rafRef.current)
      track.removeEventListener('mouseenter', pause)
      track.removeEventListener('mouseleave', resume)
      track.removeEventListener('touchstart', pause)
      track.removeEventListener('touchend', touchResume)
    }
  }, [n])

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          overflowX: 'scroll',
          gap: 20,
          padding: '32px clamp(32px, 12vw, 200px) 56px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          alignItems: 'flex-start',
          userSelect: 'none',
        }}
      >
        {looped.map((ev, i) => {
          const realI = i % n
          const isActive = realI === activeReal
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
                width: 'clamp(180px, 40vw, 240px)',
                textDecoration: 'none',
                display: 'block',
                transform: isActive ? 'scale(1.08)' : 'scale(0.85)',
                transition: 'transform 0.4s ease, opacity 0.4s ease',
                zIndex: isActive ? 2 : 1,
                position: 'relative',
                opacity: isActive ? 1 : 0.55,
              }}
            >
              <div style={{ aspectRatio: '4/5', borderRadius: 8, overflow: 'hidden', background: thumbSrc ? '#e8e0f0' : (isStreet ? 'linear-gradient(160deg,#c8e8f5,#a8d8ea)' : 'linear-gradient(160deg,#f4d6e8,#e8b8d0)'), boxShadow: isActive ? '0 16px 48px rgba(0,0,0,0.22)' : '0 4px 12px rgba(0,0,0,0.08)' }}>
                {thumbSrc
                  ? <img src={thumbSrc} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 48, opacity: 0.4 }}>{isStreet ? '🌆' : '🏢'}</span>
                    </div>
                }
              </div>
              <div style={{ padding: '12px 4px 0', textAlign: 'center' }}>
                <div style={{ ...serif, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#0d1f3a', lineHeight: 1, marginBottom: 6, letterSpacing: '0.02em' }}>
                  {date}（{dow}）
                </div>
                {ev.title && <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 3 }}>{ev.title}</div>}
                {ev.subtitle && <div style={{ fontSize: 11, color: '#888' }}>{ev.subtitle}</div>}
              </div>
            </Link>
          )
        })}
      </div>
      <style>{`div::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}
