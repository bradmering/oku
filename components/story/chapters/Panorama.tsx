'use client'

import { useEffect, useRef, useState } from 'react'
import {
  annotationScreenX,
  annotationVisibility,
  panDistance,
  panProgress,
  scrollHeight,
} from '@/lib/panorama'

/**
 * A wide panorama that pans sideways as you scroll past it.
 *
 * **Sticky, not scroll-jacked.** The chapter reserves a tall block of ordinary
 * scroll and pins the image inside it, so `preventDefault` is never called: the
 * reader can always keep going, momentum behaves, and there is no trap. That was
 * the condition for building this at all — see decisions/0019.
 *
 * Annotations are points in image space (`x`, `y` in 0..1, top-left origin),
 * the same coordinate idea the topo stage already uses for `bounds`.
 *
 * Degrades to a plainly scrollable wide image under `prefers-reduced-motion`,
 * which is a real reading mode here and not a fallback nobody sees.
 */

type Annotation = { x: number; y?: number; label: string; note?: string }

export default function Panorama({
  src,
  caption,
  heading,
  annotations = [],
  rate = 1,
}: {
  src: string
  caption?: string
  heading?: string
  annotations?: Annotation[]
  rate?: number
}) {
  const outer = useRef<HTMLElement>(null)
  const img = useRef<HTMLImageElement>(null)

  const [size, setSize] = useState({ imageW: 0, viewportW: 0, viewportH: 0 })
  const [progress, setProgress] = useState(0)
  const [reduced, setReduced] = useState(false)
  const [cursor, setCursor] = useState<number | null>(null)
  // Same `?debug` switch Story uses, read here rather than threaded through
  // ChapterView — the readout is about this image, not about the trip.
  const [debug, setDebug] = useState(false)
  useEffect(() => { setDebug(new URLSearchParams(location.search).has('debug')) }, [])

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(q.matches)
    sync()
    q.addEventListener('change', sync)
    return () => q.removeEventListener('change', sync)
  }, [])

  // The rendered width isn't knowable until the image loads — it depends on the
  // viewport height, since the image is sized to fill it.
  useEffect(() => {
    const measure = () => {
      const el = img.current
      if (!el) return
      setSize({
        imageW: el.offsetWidth,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
      })
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    if (img.current) ro.observe(img.current)
    return () => { window.removeEventListener('resize', measure); ro.disconnect() }
  }, [src])

  const distance = panDistance(size.imageW, size.viewportW)

  useEffect(() => {
    if (reduced || distance <= 0) return
    let queued = false
    const update = () => {
      queued = false
      const el = outer.current
      if (!el) return
      setProgress(panProgress(el.getBoundingClientRect().top, distance, rate))
    }
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [distance, rate, reduced])

  // ── reduced motion: a wide image you scroll by hand ────────────────────────
  if (reduced) {
    return (
      <figure className="my-16 mx-0">
        {heading && <h2 className="px-6 mb-4 text-2xl">{heading}</h2>}
        <div className="overflow-x-auto">
          <img src={src} alt={caption ?? heading ?? ''} className="h-[60vh] max-w-none w-auto" />
        </div>
        {(caption || annotations.length > 0) && (
          <figcaption className="px-6 mt-3 text-stone-400 text-sm italic">
            {caption}
            {annotations.length > 0 && (
              // The labels are content, not decoration — losing them to a media
              // query would lose the point of the chapter.
              <span className="not-italic"> Left to right: {annotations.map((a) => a.label).join(' · ')}.</span>
            )}
          </figcaption>
        )}
      </figure>
    )
  }

  const translateX = distance * progress

  return (
    <section
      ref={outer}
      className="relative"
      style={{ height: `${scrollHeight(distance, size.viewportH, rate)}px` }}
    >
      <div
        className="sticky top-0 h-screen w-full overflow-hidden bg-black"
        onMouseMove={debug ? (e) => setCursor((e.clientX + translateX) / (size.imageW || 1)) : undefined}
        onMouseLeave={debug ? () => setCursor(null) : undefined}
      >
        <img
          ref={img}
          src={src}
          alt={caption ?? heading ?? ''}
          onLoad={(e) => setSize((s) => ({ ...s, imageW: e.currentTarget.offsetWidth }))}
          className="h-screen max-w-none w-auto will-change-transform"
          style={{ transform: `translate3d(${-translateX}px,0,0)` }}
        />

        {annotations.map((a, i) => {
          const screenX = annotationScreenX(a.x, size.imageW, translateX)
          const opacity = annotationVisibility(screenX, size.viewportW)
          if (opacity <= 0) return null
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 pointer-events-none transition-opacity duration-200"
              style={{ left: screenX, top: `${(a.y ?? 0.42) * 100}%`, opacity }}
            >
              <div className="w-px h-14 mx-auto bg-white/70" />
              <div className="mt-2 px-2.5 py-1.5 rounded bg-black/75 backdrop-blur-sm text-center max-w-56">
                <p className="m-0 text-white text-sm leading-tight">{a.label}</p>
                {a.note && <p className="m-0 mt-1 text-stone-400 text-xs leading-snug">{a.note}</p>}
              </div>
            </div>
          )
        })}

        {heading && (
          <h2 className="absolute top-8 left-8 m-0 text-3xl text-white drop-shadow-lg">{heading}</h2>
        )}
        {caption && (
          <figcaption className="absolute bottom-8 left-8 right-8 m-0 text-stone-300 text-sm italic drop-shadow">
            {caption}
          </figcaption>
        )}

        {/* Authoring aid: the x you'd put in `annotations`. Same instinct as the
            camera picker — don't make anyone guess a coordinate. */}
        {debug && (
          <div className="absolute top-4 right-4 px-3 py-2 rounded bg-black/85 border border-white/15 font-mono text-[11px] text-stone-400">
            <div>progress <b className="text-white">{progress.toFixed(3)}</b></div>
            <div>image <b className="text-white">{size.imageW}px</b> · pan <b className="text-white">{Math.round(distance)}px</b></div>
            <div>cursor x <b className="text-white">{cursor === null ? '—' : cursor.toFixed(3)}</b></div>
          </div>
        )}
      </div>
    </section>
  )
}
