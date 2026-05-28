'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }
const DEFAULT_COLOR = '#a8e2f4'



const colorCache = {}

async function extractAccentColor(src) {
  if (colorCache[src]) return colorCache[src]
  try {
    const res = await fetch(`/api/image-color?url=${encodeURIComponent(src)}`)
    const { color } = await res.json()
    colorCache[src] = color
    return color
  } catch {
    return DEFAULT_COLOR
  }
}

export default function HeroSection({ images, mobileImages }) {
  const [current, setCurrent] = useState(0)
  const [currentMobile, setCurrentMobile] = useState(0)
  const [leavingSrc, setLeavingSrc] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const [animPhase, setAnimPhase] = useState('idle')
  const [accentColor, setAccentColor] = useState(DEFAULT_COLOR)
  const currentRef = useRef(0)
  const currentMobileRef = useRef(0)

  const imgs = images?.length > 0 ? images : []
  const hasMobileImages = (mobileImages?.length ?? 0) > 0
  const mobileImgs = hasMobileImages ? mobileImages : imgs

  // PC images interval
  useEffect(() => {
    if (imgs.length <= 1) return
    const t = setInterval(() => {
      const prev = currentRef.current
      const next = (prev + 1) % imgs.length
      setLeavingSrc(imgs[prev])
      setAnimKey(k => k + 1)
      setCurrent(next)
      currentRef.current = next
    }, 5000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs.length])

  // Mobile images interval
  useEffect(() => {
    if (!hasMobileImages) return
    if (mobileImgs.length <= 1) return
    const t = setInterval(() => {
      const prev = currentMobileRef.current
      const next = (prev + 1) % mobileImgs.length
      setLeavingSrc(mobileImgs[prev])
      setAnimKey(k => k + 1)
      setCurrentMobile(next)
      currentMobileRef.current = next
    }, 5000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMobileImages, mobileImgs.length])

  // Diagonal split animation phases
  useEffect(() => {
    if (!leavingSrc) { setAnimPhase('idle'); return }
    setAnimPhase('idle')
    const t0 = setTimeout(() => setAnimPhase('moving'), 30)
    const t1 = setTimeout(() => setAnimPhase('fading'), 700)
    const t2 = setTimeout(() => { setLeavingSrc(null); setAnimPhase('idle') }, 3100)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey])

  // Accent color extraction — cached, runs for both PC and mobile
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerHeight > window.innerWidth
    const src = (isMobile && hasMobileImages) ? mobileImgs[currentMobile] : imgs[current]
    if (!src) return
    extractAccentColor(src).then(setAccentColor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, currentMobile])

  const tlStyle = animPhase === 'moving'
    ? { clipPath: 'polygon(0% 0%, 45% 0%, 0% 45%)', opacity: 1, transition: 'clip-path 0.25s cubic-bezier(0,0,0.2,1)' }
    : animPhase === 'fading'
    ? { clipPath: 'polygon(0% 0%, 10% 0%, 0% 10%)', opacity: 0, transition: 'clip-path 2s ease, opacity 2s ease' }
    : { clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)', opacity: 1, transition: 'none' }

  const brStyle = animPhase === 'moving'
    ? { clipPath: 'polygon(100% 55%, 100% 100%, 55% 100%)', opacity: 1, transition: 'clip-path 0.25s cubic-bezier(0,0,0.2,1)' }
    : animPhase === 'fading'
    ? { clipPath: 'polygon(100% 90%, 100% 100%, 90% 100%)', opacity: 0, transition: 'clip-path 2s ease, opacity 2s ease' }
    : { clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)', opacity: 1, transition: 'none' }

  return (
    <section
      onContextMenu={e => e.preventDefault()}
      style={{ position: 'relative', height: '100svh', minHeight: 600, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', background: '#000', WebkitUserSelect: 'none', userSelect: 'none' }}>

      {/* Desktop image */}
      <span className="hero-desktop">
        {imgs.length > 0
          ? <img key={current} src={imgs[current]} alt="" fetchPriority={current === 0 ? 'high' : 'auto'} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', WebkitTouchCallout: 'none', pointerEvents: 'none' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)' }} />
        }
      </span>

      {/* Mobile image — blur reduced from 8px to 3px to lower GPU heating */}
      <span className="hero-mobile">
        {mobileImgs.length > 0
          ? <>
              <img key={`mblur-${currentMobile}`} src={mobileImgs[currentMobile]} alt="" fetchPriority="high"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(1px) brightness(0.85)', transform: 'scale(1.02)', transformOrigin: 'center' }} />
              <img key={`mb-${currentMobile}`} src={mobileImgs[currentMobile]} alt="" draggable={false}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', WebkitTouchCallout: 'none', pointerEvents: 'none' }} />
            </>
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)' }} />
        }
      </span>

      {/* Leaving image — diagonal split transition */}
      {leavingSrc && (
        <>
          <div style={{ position: 'absolute', inset: 0, display: 'block', zIndex: 5, filter: 'drop-shadow(4px 4px 12px rgba(0,0,0,0.7))', ...tlStyle }}>
            <img src={leavingSrc} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', WebkitTouchCallout: 'none', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'block', zIndex: 5, filter: 'drop-shadow(-4px -4px 12px rgba(0,0,0,0.7))', ...brStyle }}>
            <img src={leavingSrc} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', WebkitTouchCallout: 'none', pointerEvents: 'none' }} />
          </div>
        </>
      )}

      {/* Top-right label */}
      <div style={{ position: 'absolute', top: 28, right: 28, textAlign: 'right', zIndex: 10 }}>
        <div style={{ ...serif, fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Photography × Model</div>
        <div style={{ ...serif, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Since 2026</div>
      </div>

      {/* Main text */}
      <div style={{ position: 'relative', zIndex: 10, padding: 'clamp(32px, 5vw, 64px)', width: '100%' }}>
        <p style={{ ...serif, fontSize: 'clamp(11px, 1.5vw, 13px)', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.85)', marginBottom: 12, textTransform: 'uppercase', fontStyle: 'italic', textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}>
          Let your own unique flower bloom
        </p>
        <h1 style={{ ...serif, fontSize: 'clamp(64px, 14vw, 140px)', fontWeight: 300, lineHeight: 0.9, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          <span style={{ display: 'block', fontWeight: 300, color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>Photo</span>
          <span style={{ display: 'block', fontWeight: 700, fontStyle: 'italic', color: accentColor, transition: 'color 1.8s ease', textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}>FLEUR</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
          <Link href="/schedule" style={{
            ...serif, fontSize: 'clamp(13px, 1.8vw, 16px)', letterSpacing: '0.2em',
            color: '#fff', textDecoration: 'none', textTransform: 'uppercase',
            borderBottom: `1px solid ${accentColor}`, paddingBottom: 4,
            transition: 'border-color 1.8s ease',
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}>
            View Schedule
          </Link>
          <Link href="/models" style={{
            ...serif, fontSize: 'clamp(13px, 1.8vw, 16px)', letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.85)', textDecoration: 'none', textTransform: 'uppercase',
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}>
            Our Models
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: 'absolute', bottom: 32, right: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <div style={{ ...serif, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', writingMode: 'vertical-rl' }}>Scroll</div>
        <div style={{ width: 1, height: 48, background: `linear-gradient(to bottom, ${accentColor}, transparent)`, transition: 'background 1.8s ease' }} />
      </div>

      {/* Image dots */}
      {imgs.length > 1 && (
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
          {imgs.map((_, i) => (
            <button key={i} onClick={() => {
              setLeavingSrc(imgs[current])
              setAnimKey(k => k + 1)
              setCurrent(i)
              currentRef.current = i
            }}
              style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: i === current ? accentColor : 'rgba(255,255,255,0.35)', transition: 'all 0.4s ease' }} />
          ))}
        </div>
      )}
    </section>
  )
}
