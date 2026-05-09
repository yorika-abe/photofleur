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
  const trackRef = useRef(null)
  const isPausedRef = useRef(false)
  const currentIndexRef = useRef(0) // index in looped array

  if (!events || events.length === 0) return null

  const n = events.length
  const looped = [...events, ...events, ...events]

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    function getCards() { return track.querySelectorAll('.s-card') }

    function scrollToCard(index, smooth) {
      const cards = getCards()
      const card = cards[index]
      if (!card) return
      // Position so this card is second from left: left edge + one card width + gap
      const cardW = card.offsetWidth
      const gap = 20
      const target = card.offsetLeft - cardW - gap
      track.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'instant' })
    }

    function updateActive(index) {
      const cards = getCards()
      // Active = card at index+1 (second from left)
      const activeCard = cards[index + 1] ?? cards[index]
      cards.forEach(card => {
        const active = card === activeCard
        card.style.transform = active ? 'scale(1.08)' : 'scale(0.85)'
        card.style.opacity = active ? '1' : '0.55'
        card.style.zIndex = active ? '2' : '1'
      })
    }

    // Start at beginning of second set
    const startIndex = n
    currentIndexRef.current = startIndex

    setTimeout(() => {
      scrollToCard(startIndex, false)
      updateActive(startIndex)
    }, 100)

    const interval = setInterval(() => {
      if (isPausedRef.current) return

      const next = currentIndexRef.current + 1
      currentIndexRef.current = next
      scrollToCard(next, true)
      updateActive(next)

      // After smooth scroll animation (~600ms), silently jump back if in last set
      setTimeout(() => {
        if (currentIndexRef.current >= n * 2) {
          const reset = currentIndexRef.current - n
          currentIndexRef.current = reset
          scrollToCard(reset, false)
          updateActive(reset)
        }
      }, 650)
    }, 3000)

    const pause = () => { isPausedRef.current = true }
    const resume = () => { isPausedRef.current = false }
    const touchResume = () => setTimeout(resume, 2000)

    track.addEventListener('mouseenter', pause)
    track.addEventListener('mouseleave', resume)
    track.addEventListener('touchstart', pause, { passive: true })
    track.addEventListener('touchend', touchResume)

    return () => {
      clearInterval(interval)
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
          padding: '32px 0 56px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          alignItems: 'flex-start',
          userSelect: 'none',
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
                marginLeft: i === 0 ? 'clamp(32px, 12vw, 200px)' : 0,
                marginRight: i === looped.length - 1 ? 'clamp(32px, 12vw, 200px)' : 0,
                textDecoration: 'none',
                display: 'block',
                transform: 'scale(0.85)',
                opacity: '0.55',
                transition: 'transform 0.4s ease, opacity 0.4s ease',
                zIndex: 1,
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
