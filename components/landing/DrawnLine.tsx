'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A single line that draws as you scroll.
 *
 * The landing page does what the product does: scroll position drives the
 * drawing, continuously, rather than triggering it. Same idea as the story
 * renderer's route interpolation, without needing a map.
 */
export default function DrawnLine() {
  const path = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (path.current) setLen(path.current.getTotalLength())
  }, [])

  useEffect(() => {
    let queued = false
    const update = () => {
      queued = false
      const scrollable = document.body.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0)
    }
    // Event-driven with rAF coalescing — not a free-running loop.
    const onChange = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange)
    return () => {
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  // A little head-start so the line is visible before you scroll at all.
  const drawn = len * (0.06 + progress * 0.94)

  return (
    <svg className="drawn" viewBox="0 0 400 1400" preserveAspectRatio="none" aria-hidden="true">
      <path
        ref={path}
        d="M 60 20
           C 60 120, 250 150, 250 260
           S 90 380, 100 470
           C 108 560, 300 570, 300 680
           S 120 800, 140 900
           C 158 990, 320 1000, 300 1100
           S 150 1240, 200 1380"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          strokeDasharray: len,
          strokeDashoffset: len ? len - drawn : len,
        }}
      />
    </svg>
  )
}
