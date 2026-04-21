'use client'

import { useEffect } from 'react'

export default function ScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    const targets = document.querySelectorAll('.reveal')
    targets.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return null
}
