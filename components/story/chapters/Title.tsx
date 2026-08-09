'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The opening card, in three presentations.
 *
 * `image`  — full-bleed photograph with the text over a scrim. The default, and
 *            what the blog does.
 * `text`   — no photograph. Typographic, with the stage visible behind, which
 *            makes the map the opening image instead of a picture.
 * `reveal` — text alone, then the photograph fading in behind it as you scroll.
 *            A taller card: the fade is the reason to keep scrolling.
 */
export default function Title({
  heading,
  subheading,
  text,
  image,
  layout,
  byline,
}: {
  heading?: string
  subheading?: string
  text?: string
  image?: string
  layout?: 'image' | 'text' | 'reveal'
  byline: string
}) {
  const mode = layout ?? (image ? 'image' : 'text')
  const ref = useRef<HTMLDivElement>(null)
  const [reveal, setReveal] = useState(0)

  // Only the reveal variant needs scroll. Same event-driven pattern as the
  // camera — no free-running loop.
  useEffect(() => {
    if (mode !== 'reveal') return
    let queued = false
    const update = () => {
      queued = false
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const travelled = -r.top
      const total = Math.max(1, r.height - window.innerHeight)
      setReveal(Math.min(1, Math.max(0, travelled / total)))
    }
    const onChange = () => { if (!queued) { queued = true; requestAnimationFrame(update) } }
    update()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange)
    return () => {
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [mode])

  const Words = ({ onDark = true }: { onDark?: boolean }) => (
    <>
      <h1 className={`font-bold tracking-tight leading-[1.04] text-balance ${
        mode === 'text' ? 'text-[clamp(2.75rem,8vw,5.5rem)]' : 'text-5xl sm:text-7xl'
      } ${onDark ? 'text-white drop-shadow-lg' : 'text-stone-900'}`}>
        {heading}
      </h1>
      {subheading && (
        <p className={`mt-4 text-lg max-w-2xl text-pretty ${onDark ? 'text-white/80' : 'text-stone-500'}`}>
          {subheading}
        </p>
      )}
      {text && (
        <div className={`mt-6 max-w-2xl leading-8 ${onDark ? 'text-white/75' : 'text-stone-600'}`}>
          {text.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-4 last:mb-0">{p}</p>)}
        </div>
      )}
      <p className={`mt-10 text-[11px] uppercase tracking-[0.18em] font-mono ${onDark ? 'text-white/50' : 'text-stone-400'}`}>
        {byline}
      </p>
    </>
  )

  if (mode === 'text') {
    return (
      <header className="relative z-10 min-h-screen flex flex-col justify-center px-6 sm:px-12 max-w-5xl mx-auto">
        {/* Just enough veil to keep type legible over whatever the stage shows. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-ink/85 to-ink/60 pointer-events-none" />
        <Words />
      </header>
    )
  }

  if (mode === 'reveal') {
    return (
      <header ref={ref} className="relative z-10 h-[200vh]">
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center px-6 sm:px-12">
          {image && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-none"
              style={{ backgroundImage: `url('${image}')`, opacity: reveal }}
            />
          )}
          {/* Scrim deepens with the image so the text never loses contrast. */}
          <div className="absolute inset-0 bg-ink pointer-events-none" style={{ opacity: 1 - reveal * 0.45 }} />
          <div className="relative max-w-5xl mx-auto w-full">
            <Words />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="relative z-10 min-h-screen flex flex-col justify-center items-center text-center px-6 py-24 overflow-hidden">
      {image && (
        <>
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/70" />
        </>
      )}
      <div className="relative flex flex-col items-center">
        <Words />
      </div>
    </header>
  )
}
