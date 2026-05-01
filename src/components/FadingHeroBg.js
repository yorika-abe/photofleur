'use client'
import { useState, useEffect } from 'react'

export default function FadingHeroBg({ images, opacity = 0.35 }) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(() => setCurrent(i => (i + 1) % images.length), 5000)
    return () => clearInterval(t)
  }, [images.length])
  if (!images || images.length === 0) return null
  return (
    <>
      {images.map((src, i) => (
        <img key={src} src={src} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', opacity: i === current ? opacity : 0,
          transition: 'opacity 1.5s ease',
        }} />
      ))}
    </>
  )
}
