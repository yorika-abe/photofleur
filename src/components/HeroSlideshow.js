'use client'

import { useState, useEffect } from 'react'

export default function HeroSlideshow({ images, objectFit = 'cover' }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!images || images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(i => (i + 1) % images.length)
    }, 5000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images?.length])

  if (!images || images.length === 0) {
    return <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d1f3a 0%, #1a3a60 45%, #0d2030 100%)' }} />
  }

  return (
    <>
      {images.map((src, i) => (
        <img key={src} src={src} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit,
          opacity: i === current ? 1 : 0,
          transition: 'opacity 1.5s ease',
        }} />
      ))}
    </>
  )
}
