'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }
const DEFAULT_COLOR = '#a8e2f4'

function optimizeUrl(src, width = 1920) {
  if (!src) return src
  if (src.startsWith('/_next/') || src.startsWith('data:')) return src
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=80`
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s, l]
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const colorCache = {}

function extractAccentColor(src) {
  if (colorCache[src]) return Promise.resolve(colorCache[src])
  const url = optimizeUrl(src, 128)
  return fetch(url)
    .then(r => r.blob())
    .then(blob => new Promise(resolve => {
      const objectUrl = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 80; canvas.height = 80
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, 80, 80)
          const { data } = ctx.getImageData(0, 0, 80, 80)
          URL.revokeObjectURL(objectUrl)
          const buckets = new Float32Array(36)
          for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
            if (s < 0.2 || l < 0.12 || l > 0.88) continue
            buckets[Math.floor(h / 10) % 36] += s
          }
          const max = Math.max(...buckets)
          const color = max === 0 ? DEFAULT_COLOR : hslToHex(buckets.indexOf(max) * 10, 78, 72)
          colorCache[src] = color
          resolve(color)
        } catch { URL.revokeObjectURL(objectUrl); resolve(DEFAULT_COLOR) }
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(DEFAULT_COLOR) }
      img.src = objectUrl
    }))
    .catch(() => DEFAULT_COLOR)
}

export default function HeroSection({ images, mobileImages }) {
  const [current, setCurrent] = useState(0)
  const [currentMobile, setCurrentMobile] = useState(0)
  const [fadeKey, setFadeKey] = useState(0)
  const [accentColor, setAccentColor] = useState(DEFAULT_COLOR)
  const [isMobile, setIsMobile] = useState(false)
  const currentRef = useRef(0)
  const currentMobileRef = useRef(0)

  const imgs = images?.length > 0 ? images : []
  const hasMobileImages = (mobileImages?.length ?? 0) > 0
  const mobileImgs = hasMobileImages ? mobileImages : imgs

  useEffect(() => {
    setIsMobile(window.innerHeight > window.innerWidth)
  }, [])

  // PC images interval
  useEffect(() => {
    if (imgs.length <= 1) return
    const t = setInterval(() => {
      const next = (currentRef.current + 1) % imgs.length
      setCurrent(next)
      setFadeKey(k => k + 1)
      currentRef.current = next
    }, 6000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs.length])

  // Mobile images interval
  useEffect(() => {
    if (!hasMobileImages || mobileImgs.length <= 1) return
    const t = setInterval(() => {
      const next = (currentMobileRef.current + 1) % mobileImgs.length
      setCurrentMobile(next)
      setFadeKey(k => k + 1)
      currentMobileRef.current = next
    }, 6000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMobileImages, mobileImgs.length])

  // Accent color extraction — cached, skipped on mobile to save CPU
  useEffect(() => {
    if (isMobile) return
    const src = imgs[current]
    if (!src) return
    extractAccentColor(src).then(setAccentColor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isMobile])

  // Extract color once on desktop mount
  useEffect(() => {
    if (isMobile || !imgs[0]) return
    extractAccentColor(imgs[0]).then(setAccentColor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  return (
    <section
      onContextMenu={e => e.preventDefault()}
      style={{ position: 'relative', height: '100svh', minHeight: 600, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', background: '#000', WebkitUserSelect: 'none', userSelect: 'none' }}>

      {/* Desktop image — simple crossfade via key */}
      <span className="hero-desktop">
        {imgs.length > 0
          ? <img key={`d-${current}`} src={imgs[current]} alt="" fetchPriority={current === 0 ? 'high' : 'auto'} draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', animation: 'heroFadeIn 1s ease', pointerEvents: 'none' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)' }} />
        }
      </span>

      {/* Mobile image — objectFit cover, no blur (blur causes heating) */}
      <span className="hero-mobile">
        {mobileImgs.length > 0
          ? <img key={`m-${currentMobile}`} src={mobileImgs[currentMobile]} alt="" fetchPriority="high" draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', animation: 'heroFadeIn 1s ease', pointerEvents: 'none' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)' }} />
        }
        {/* Dark gradient overlay instead of blur */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
      </span>

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
            <button key={i} onClick={() => { setCurrent(i); setFadeKey(k => k + 1); currentRef.current = i }}
              style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: i === current ? accentColor : 'rgba(255,255,255,0.35)', transition: 'all 0.4s ease' }} />
          ))}
        </div>
      )}
    </section>
  )
}
