'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Lightbox, { type LightboxImage } from '../Lightbox'

type Media = { type: 'image' | 'video'; src: string; caption?: string; poster?: string; loop?: boolean }

/**
 * The article chapter — a light panel over the dark stage.
 *
 * Classes are the blog's, near-verbatim: hero beside the prose at 85vh with the
 * side alternating on `align`, a wrapped media strip beneath, and full-width
 * videos in the scroll. This is where Brooks Range keeps almost all of its
 * photographs — 10 hero images and 37 in `media[]`.
 */
export default function Article({
  heading,
  subheading,
  text,
  align,
  heroImage,
  media,
  stats,
}: {
  heading?: string
  subheading?: string
  text?: string
  align?: 'left' | 'right'
  heroImage?: { src: string; caption?: string }
  media?: Media[]
  stats?: React.ReactNode
}) {
  const [open, setOpen] = useState<number | null>(null)
  const isLeft = align !== 'right'

  const images = useMemo(() => (media ?? []).filter((m) => m.type === 'image'), [media])
  const videos = useMemo(() => (media ?? []).filter((m) => m.type === 'video'), [media])

  // The lightbox spans the hero plus every media image, in display order.
  const lightbox: LightboxImage[] = useMemo(() => {
    const out: LightboxImage[] = []
    if (heroImage) out.push(heroImage)
    for (const m of images) out.push({ src: m.src, caption: m.caption })
    return out
  }, [heroImage, images])
  const offset = heroImage ? 1 : 0

  return (
    <div className="relative z-10 bg-white pointer-events-auto">
      <div className={`flex flex-col md:flex-row md:min-h-[85vh] ${isLeft ? '' : 'md:flex-row-reverse'}`}>
        {heroImage && (
          <div className="md:w-[46%] w-full flex-shrink-0 relative overflow-hidden group">
            <img
              src={heroImage.src}
              alt={heroImage.caption ?? ''}
              loading="lazy"
              decoding="async"
              className="block w-full h-64 sm:h-96 md:h-full object-cover cursor-zoom-in transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              onClick={() => setOpen(0)}
            />
            {heroImage.caption && (
              <p className="md:absolute md:bottom-0 md:left-0 md:right-0 mt-1.5 md:mt-0 px-4 py-2 md:py-3 text-stone-400 md:text-white/85 text-xs italic md:bg-gradient-to-t md:from-black/60 md:to-transparent pointer-events-none">
                {heroImage.caption}
              </p>
            )}
          </div>
        )}

        <div className="flex-1 flex items-center px-6 sm:px-12 py-14 sm:py-20">
          <div className="max-w-xl mx-auto md:mx-0">
            {subheading && (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-3">
                {subheading}
              </p>
            )}
            {heading && (
              <h2 className="text-2xl font-bold text-stone-900 mb-4 leading-snug tracking-tight">
                {heading}
              </h2>
            )}
            {stats}
            {text?.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="mb-4 text-stone-700 leading-8 text-[1.02rem] last:mb-0">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center items-center px-4 sm:px-8 py-8 bg-stone-50">
          {images.map((m, i) => (
            <img
              key={i}
              src={m.src}
              alt={m.caption ?? ''}
              loading="lazy"
              decoding="async"
              className="h-64 sm:h-80 w-auto max-w-full rounded-sm shadow-sm cursor-zoom-in transition-transform duration-500 ease-out hover:scale-[1.02]"
              onClick={() => setOpen(offset + i)}
            />
          ))}
        </div>
      )}

      {videos.map((m, i) => <ScrollVideo key={i} media={m} />)}

      {open !== null && (
        <Lightbox images={lightbox} index={open} onClose={() => setOpen(null)} onNav={setOpen} />
      )}
    </div>
  )
}

/** Plays only while on screen. `preload="none"` matters — Brooks Range carries
 *  nine videos, and preloading them all would cost tens of megabytes on load. */
function ScrollVideo({ media }: { media: Media }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() },
      { threshold: 0.4 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])

  return (
    <figure className="relative w-full bg-black m-0">
      <video
        ref={ref}
        src={media.src}
        poster={media.poster}
        loop={media.loop ?? true}
        muted
        playsInline
        preload="none"
        controls
        className="w-full h-auto max-h-[90vh] object-contain mx-auto"
      />
      {media.caption && (
        <figcaption className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm italic px-6 pointer-events-none drop-shadow">
          {media.caption}
        </figcaption>
      )}
    </figure>
  )
}
