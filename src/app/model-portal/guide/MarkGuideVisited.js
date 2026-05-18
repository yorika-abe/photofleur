'use client'

import { useEffect } from 'react'

export default function MarkGuideVisited() {
  useEffect(() => {
    localStorage.setItem('model_guide_visited', '1')
  }, [])
  return null
}
