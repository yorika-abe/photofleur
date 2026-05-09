'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' }
const DEFAULT_COLOR = '#a8e2f4'

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

function extractAccentColor(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 80; canvas.height = 80
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, 80, 80)
        const { data } = ctx.getImageData(0, 0, 80, 80)
        const buckets = new Float32Array(36)
        for (let i = 0; i < data.length; i += 4) {
          const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
          if (s < 0.2 || l < 0.12 || l > 0.88) continue
          buckets[Math.floor(h / 10) % 36] += s
        }
        const max = Math.max(...buckets)
        if (max === 0) { resolve(DEFAULT_COLOR); return }
        resolve(hslToHex(buckets.indexOf(max) * 10, 78, 72))
      } catch { resolve(DEFAULT_COLOR) }
    }
    img.onerror = () => resolve(DEFAULT_COLOR)
    img.src = src.includes('?') ? src + '&_c=1' : src + '?_c=1'
  })
}

export default function HeroSection({ images, mobileImages }) {
  const [current, setCurrent] = useState(0)
  const [leavingSrc, setLeavingSrc] = useState(null)
  const [leavingMobileSrc, setLeavingMobileSrc] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const [accentColor, setAccentColor] = useState(DEFAULT_COLOR)
  const currentRef = useRef(0)

  const imgs = images?.length > 0 ? images : []
  const mobileImgs = mobileImages?.length > 0 ? mobileImages : imgs

  useEffect(() => {
    if (imgs.length <= 1) return
    const t = setInterval(() => {
      const prev = currentRef.current
      const next = (prev + 1) % imgs.length
      setLeavingSrc(imgs[prev])
      setLeavingMobileSrc(mobileImgs[prev] || imgs[prev])
      setAnimKey(k => k + 1)
      setCurrent(next)
      currentRef.current = next
    }, 5000)
    return () => clearInterval(t)
  }, [imgs, mobileImgs])

  useEffect(() => {
    if (!leavingSrc) return
    const t = setTimeout(() => { setLeavingSrc(null); setLeavingMobileSrc(null) }, 1800)
    return () => clearTimeout(t)
  }, [animKey])

  useEffect(() => {
    const src = imgs[current]
    if (!src) return
    extractAccentColor(src).then(setAccentColor)
  }, [current, imgs])

  return (
    <section style={{ position: 'relative', height: '100svh', minHeight: 600, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', background: '#000' }}>
      <style>{`
        @keyframes heroSplitLeft {
          0%   { transform: translateX(0);    opacity: 1; animation-timing-function: cubic-bezier(0.7,0,0.8,1); }
          28%  { transform: translateX(-50%); opacity: 1; animation-timing-function: linear; }
          46%  { transform: translateX(-50%); opacity: 1; animation-timing-function: ease-out; }
          100% { transform: translateX(-102%); opacity: 0; }
        }
        @keyframes heroSplitRight {
          0%   { transform: translateX(0);   opacity: 1; animation-timing-function: cubic-bezier(0.7,0,0.8,1); }
          28%  { transform: translateX(50%); opacity: 1; animation-timing-function: linear; }
          46%  { transform: translateX(50%); opacity: 1; animation-timing-function: ease-out; }
          100% { transform: translateX(102%); opacity: 0; }
        }
      `}</style>

      {/* Current image */}
      <span className="hero-desktop" style={{ position: 'absolute', inset: 0 }}>
        {imgs.length > 0
          ? <img key={current} src={imgs[current]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)' }} />
        }
      </span>
      <span className="hero-mobile" style={{ position: 'absolute', inset: 0 }}>
        {mobileImgs.length > 0
          ? <img key={current} src={mobileImgs[current]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)' }} />
        }
      </span>

      {/* Leaving image — split animation */}
      {leavingSrc && (
        <>
          {/* Left half */}
          <div key={`left-${animKey}`} style={{
            position: 'absolute', inset: 0,
            clipPath: 'inset(0 50% 0 0)',
            animation: 'heroSplitLeft 1.65s forwards',
            zIndex: 5,
          }} className="hero-desktop">
            <img src={leavingSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.75))' }} />
          </div>
          {/* Right half */}
          <div key={`right-${animKey}`} style={{
            position: 'absolute', inset: 0,
            clipPath: 'inset(0 0 0 50%)',
            animation: 'heroSplitRight 1.65s forwards',
            zIndex: 5,
          }} className="hero-desktop">
            <img src={leavingSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.75))' }} />
          </div>

          {/* Mobile split */}
          <div key={`mleft-${animKey}`} style={{
            position: 'absolute', inset: 0,
            clipPath: 'inset(0 50% 0 0)',
            animation: 'heroSplitLeft 1.65s forwards',
            zIndex: 5,
          }} className="hero-mobile">
            <img src={leavingMobileSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.75))' }} />
          </div>
          <div key={`mright-${animKey}`} style={{
            position: 'absolute', inset: 0,
            clipPath: 'inset(0 0 0 50%)',
            animation: 'heroSplitRight 1.65s forwards',
            zIndex: 5,
          }} className="hero-mobile">
            <img src={leavingMobileSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.75))' }} />
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
              setLeavingMobileSrc(mobileImgs[current] || imgs[current])
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
