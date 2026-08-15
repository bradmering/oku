'use client'

import { useEffect, useRef, useState } from 'react'
import { driftX, proximityOpacity } from '@/lib/landscape'
import landscapes from '@/lib/landscapes.generated.json'

/**
 * Two contour drawings that surface in the whitespace beside the passages and go
 * again — mountains, then the coast.
 *
 * That order is Bashō's. `Oku no Hosomichi` runs north through the mountains —
 * Nikkō, the Dewa Sanzan — and then out to the Japan Sea at Kisakata and
 * Matsushima. So the mountains sit beside the opening and the shore sits beside
 * "I set off on a journey to roam along the seashores." The drawings are placed
 * against the text they belong to, not wherever there happened to be room.
 *
 * **Nothing here is drawn.** Both figures are iso-lines through a synthetic
 * height field, computed at build time by `scripts/build-landscapes.ts` — go
 * there to move a summit. This component only fades them.
 *
 * They replaced hand-authored ink drawings, and the deciding argument only
 * appeared once both were on the real page at real opacity: **the ink versions
 * carried depth in per-stroke opacity** (0.3 far, 0.9 near), so multiplying by
 * the page's own fade dropped the far ridges to ~0.12 and the layering vanished
 * exactly when the drawing was faded — which is its normal state. Contours are
 * one weight throughout and dim uniformly.
 */

type Variant = 'mountains' | 'coast'
type Line = { d: string; opacity: number; dash?: string }

// Declared rather than inferred: the JSON is generated and gitignored, so its
// inferred shape depends on whatever happens to be on disk at typecheck time.
const FIGURES = landscapes as {
  view: { w: number; h: number }
  mountains: Line[]
  coast: Line[]
}

export default function Landscape({
  variant,
  side,
  className = '',
}: {
  variant: Variant
  side: 'left' | 'right'
  className?: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(q.matches)
    sync()
    q.addEventListener('change', sync)
    return () => q.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    // Reduced motion gets the drawing plainly, at a settled strength — the
    // drawing is content, the fading is decoration, and only one of those
    // should be negotiable.
    if (reduced) { setOpacity(0.5); return }

    let queued = false
    const update = () => {
      queued = false
      const node = el.current
      if (!node) return
      const r = node.getBoundingClientRect()
      setOpacity(proximityOpacity(r.top, r.height, window.innerHeight))
    }
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
  }, [reduced])

  const drift = reduced ? 0 : driftX(opacity) * (side === 'left' ? -1 : 1)
  const lines = variant === 'mountains' ? FIGURES.mountains : FIGURES.coast

  return (
    <div
      ref={el}
      aria-hidden="true"
      // `lg`, not `md`: between 768 and 1023px the text column already fills the
      // measure and the drawing lands on top of it. Whitespace has to actually
      // exist before you can put anything in it.
      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-0 hidden lg:block w-[34%] max-w-sm text-stone-300 ${
        side === 'left' ? 'left-0' : 'right-0'
      } ${className}`}
      style={{ opacity, transform: `translateY(-50%) translateX(${drift}px)` }}
    >
      <svg
        viewBox={`0 0 ${FIGURES.view.w} ${FIGURES.view.h}`}
        className="w-full h-auto"
        role="img"
      >
        {lines.map((l, i) => (
          <path
            key={i}
            d={l.d}
            opacity={l.opacity}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            {...(l.dash ? { strokeDasharray: l.dash } : {})}
          />
        ))}
      </svg>
    </div>
  )
}
