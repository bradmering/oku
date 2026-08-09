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
  anchorRef,
}: {
  heading?: string
  subheading?: string
  text?: string
  image?: string
  layout?: 'image' | 'text' | 'reveal' | 'split' | 'plate' | 'route'
  byline: string
  /** `route` only: the tall span registers as a stage anchor. See decisions/0015. */
  anchorRef?: (el: HTMLElement | null) => void
}) {
  const mode = layout ?? (image ? 'image' : 'text')
  const ref = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLImageElement>(null)
  const [reveal, setReveal] = useState(0)

  // `image` parallax: the hero drifts at ~⅓ scroll speed behind the title.
  useEffect(() => {
    if (mode !== 'image') return
    const onScroll = () => {
      if (heroRef.current) heroRef.current.style.transform = `translateY(${window.scrollY * 0.38}px)`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [mode])

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

  if (mode === 'split') {
    return (
      <header className="relative z-10 min-h-screen flex flex-col md:flex-row">
        {image && (
          <div className="md:w-1/2 h-64 md:h-auto shrink-0 overflow-hidden">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 flex items-center bg-ink px-8 sm:px-14 py-16">
          <div className="max-w-xl"><Words /></div>
        </div>
      </header>
    )
  }

  if (mode === 'plate') {
    return (
      <header className="relative z-10 min-h-screen flex flex-col justify-center items-center text-center px-6">
        <div className="absolute inset-0 -z-10 bg-ink/90 pointer-events-none" />
        <div className="max-w-2xl">
          <p className="text-ember font-mono text-[10px] uppercase tracking-[0.4em] mb-10">{byline}</p>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-[0.02em] leading-relaxed text-balance text-white">
            {heading}
          </h1>
          {subheading && (
            <p className="mt-8 text-stone-500 text-sm tracking-wide">{subheading}</p>
          )}
          <div className="mt-14 mx-auto w-10 h-px bg-white/20" />
        </div>
      </header>
    )
  }

  if (mode === 'route') {
    return (
      <header ref={anchorRef} className="relative z-10 h-[200vh]" data-route-title="">
        <div className="sticky top-0 h-screen flex flex-col justify-end px-6 sm:px-12 pb-24 pointer-events-none">
          {/* Only a floor of shade — the map is the point. */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
          <div className="relative max-w-4xl mx-auto w-full"><Words /></div>
        </div>
      </header>
    )
  }

  // `image` — the blog's opening, ported: a parallaxing hero with the title
  // anchored bottom-left, then a dark panel carrying the opening prose.
  return (
    <>
      <div className="relative h-screen overflow-hidden z-10 pointer-events-auto">
        {image ? (
          <img
            ref={heroRef}
            src={image}
            alt=""
            className="absolute inset-0 w-full object-cover will-change-transform"
            style={{ height: '130%', top: '-15%' }}
          />
        ) : (
          <div className="absolute inset-0 bg-stone-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
        <div className="absolute bottom-12 left-6 right-6 sm:left-10 sm:right-10 max-w-3xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight tracking-tight">
            {heading}
          </h1>
          {subheading && (
            <p className="mt-3 text-lg sm:text-xl text-white/65 font-light">{subheading}</p>
          )}
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">{byline}</p>
        </div>
      </div>

      {text && (
        <div className="relative z-10 bg-black pointer-events-auto">
          <div className="max-w-4xl mx-auto px-8 sm:px-14 pt-16 pb-32">
            {text.split(/\n{2,}/).map((p, i) => (
              <p key={i} className={`text-stone-200 text-xl leading-[1.85] ${i > 0 ? 'mt-10' : ''}`}>
                {p}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
