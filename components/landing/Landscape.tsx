'use client'

import { useEffect, useRef, useState } from 'react'
import { driftX, proximityOpacity } from '@/lib/landscape'

/**
 * Two ink drawings that surface in the whitespace beside the passages and go
 * again — mountains, then the coast.
 *
 * That order is Bashō's. `Oku no Hosomichi` runs north through the mountains —
 * Nikkō, the Dewa Sanzan — and then out to the Japan Sea at Kisakata and
 * Matsushima. So the mountains sit beside the opening and the shore sits beside
 * "I set off on a journey to roam along the seashores." The drawings are placed
 * against the text they belong to, not wherever there happened to be room.
 *
 * **Deliberately quiet.** They are strokes in a stone tone at low opacity, and
 * the only accent colour on this page stays the ember line that draws as you
 * scroll. Depth comes from opacity per ridge rather than from a second hue,
 * which is how sumi-e gets distance out of one ink.
 */

type Variant = 'mountains' | 'coast'

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
      {variant === 'mountains' ? <Mountains /> : <Coast />}
    </div>
  )
}

/** Stroke settings shared by both drawings — one ink, one nib. */
const ink = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

/**
 * Receding ridgelines. Far ridges are soft and faint, the near ridge is angular
 * and darker — distance carried by opacity and by how sharp the hand is, which
 * is the trick ink drawings use instead of perspective.
 */
function Mountains() {
  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto" role="img">
      {/* Furthest — soft, low, and BROKEN on the left: the gap is the mist. Ink
          drawings make weather out of absence, not out of extra strokes. */}
      <path {...ink} opacity={0.3}
        d="M 96 72 Q 124 50 150 62 Q 178 44 204 60 Q 232 52 258 66 Q 280 72 300 68" />

      {/* Middle distance. One dominant peak, off-centre, shoulders stepping down
          — and it never crosses the ridge behind it, which is what makes the
          layers read as distance rather than as tangled lines. */}
      <path {...ink} opacity={0.5}
        d="M 0 124 L 30 114 L 52 120 L 78 100 L 104 82 L 126 104 L 148 98 L 172 112 L 200 102 L 228 116 L 256 108 L 280 118 L 300 114" />

      {/* Nearest — angular, darker, and anchored to BOTH edges so the range sits
          on the frame instead of floating in it. Peaks are deliberately uneven:
          one summit, one answer, and low ground between them. */}
      <path {...ink} opacity={0.9}
        d="M 0 186 L 34 152 L 54 168 L 92 124 L 116 150 L 140 142 L 172 174 L 206 150 L 232 164 L 268 146 L 300 180" />

      {/* Two folds falling off the summit. Rock, rather than a sawtooth. */}
      <path {...ink} opacity={0.38} d="M 92 124 L 104 158" />
      <path {...ink} opacity={0.28} d="M 268 146 L 276 170" />
    </svg>
  )
}

/**
 * Kisakata and Matsushima: a flat horizon, pine islands standing off it, and a
 * shoreline that runs out of the frame. The islands are the whole reason the
 * coast is the second drawing — Bashō went there to see them.
 */
function Coast() {
  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto" role="img">
      {/* Horizon, broken where the islands stand so they read in front of it. */}
      <path {...ink} opacity={0.32} d="M 0 56 L 92 56 M 152 56 L 192 56 M 234 56 L 300 56" />

      {/* Islands, and NO pines. A trunk under a symmetrical canopy reads as a
          parasol at this size, every time — the silhouette alone says island, so
          the trees are the first thing to cut. Profiles are asymmetric, because
          a perfect arc says "dome" and rock never does. */}
      <path {...ink} opacity={0.8} d="M 92 56 Q 101 41 113 36 Q 126 29 136 39 Q 145 46 152 56" />
      <path {...ink} opacity={0.45} d="M 192 56 Q 200 46 210 44 Q 222 41 227 49 Q 231 52 234 56" />

      {/* Surf: nested arcs tightening toward the shore. The tightening IS the
          perspective — evenly spaced lines read as a pattern, crowded ones read
          as water coming in. */}
      <path {...ink} opacity={0.22} d="M 26 92 Q 92 82 158 92" />
      <path {...ink} opacity={0.26} d="M 48 114 Q 116 103 184 114" />
      <path {...ink} opacity={0.3} d="M 74 132 Q 138 122 202 132" />
      <path {...ink} opacity={0.34} d="M 102 146 Q 156 138 210 146" />

      {/* Two short foam marks, off the rhythm, so the surf isn't a stack. */}
      <path {...ink} opacity={0.2} d="M 214 124 Q 236 119 258 124" />
      <path {...ink} opacity={0.16} d="M 168 158 Q 190 153 212 158" />

      {/* The shoreline: a long shallow S spanning the full width, which is what
          anchors the whole drawing to the frame. */}
      <path {...ink} opacity={0.9} d="M 0 176 Q 72 163 142 170 T 300 162" />
      <path {...ink} opacity={0.28} d="M 0 186 Q 78 174 150 180 T 300 172" />
    </svg>
  )
}
