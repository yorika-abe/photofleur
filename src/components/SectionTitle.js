'use client'
import { useEffect, useRef } from 'react'

const CHARS = ['✦', '✧', '⋆', '✺', '✻', '·', '∗', '✨']

export default function SectionTitle({ text }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let progress = -0.05
    let raf
    const SPEED = 0.0018

    // Main fairy glow dot
    const fairy = document.createElement('span')
    fairy.style.cssText = `
      position: absolute;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: radial-gradient(circle, #fff 0%, #ffe066 40%, transparent 70%);
      box-shadow: 0 0 10px 5px #ffd700, 0 0 22px 10px rgba(255,200,50,0.5);
      pointer-events: none;
      z-index: 25;
      top: 50%; transform: translateY(-50%);
      transition: opacity 0.2s;
    `
    container.appendChild(fairy)

    let frame = 0

    function spawnSparkle() {
      const el = document.createElement('span')
      const size = Math.random() * 13 + 7
      const offsetX = (Math.random() - 0.5) * 30
      const offsetY = (Math.random() - 0.5) * 70
      const dur = 0.45 + Math.random() * 0.45
      el.style.cssText = `
        position: absolute;
        left: calc(${progress * 100}% + ${offsetX}px);
        top: calc(50% + ${offsetY}px);
        font-size: ${size}px;
        color: #ffe066;
        text-shadow: 0 0 ${size}px #ffd700, 0 0 ${size * 2}px rgba(255,170,44,0.7);
        pointer-events: none;
        animation: sparkleFade ${dur}s ease-out forwards;
        z-index: 20;
        line-height: 1;
      `
      el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)]
      container.appendChild(el)
      setTimeout(() => el.parentNode === container && container.removeChild(el), dur * 1000 + 50)
    }

    function tick() {
      progress += SPEED
      if (progress > 1.12) progress = -0.05

      const visible = progress >= 0 && progress <= 1
      fairy.style.left = `${progress * 100}%`
      fairy.style.opacity = visible ? '1' : '0'

      frame++
      if (visible && frame % 4 === 0) spawnSparkle()

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (fairy.parentNode === container) container.removeChild(fairy)
    }
  }, [])

  return (
    <>
      <style>{`
        @keyframes shimmerTitle {
          0%   { background-position: -300% center; }
          100% { background-position:  300% center; }
        }
        @keyframes sparkleFade {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.1) translateY(-18px); }
        }
        .shimmer-section-title {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(56px, 10vw, 100px);
          font-weight: 300;
          letter-spacing: 0.15em;
          display: inline-block;
          background: linear-gradient(90deg,
            #f4b8cc 0%, #a8d8f0 20%, #f9d0e0 40%, #c8e8f8 60%, #f4b8cc 80%, #a8d8f0 100%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerTitle 10s linear infinite;
        }
      `}</style>
      <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', overflow: 'visible' }}>
        <span className="shimmer-section-title">{text}</span>
      </div>
    </>
  )
}
