'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Lightbox, { type LightboxImage } from '../Lightbox'

type Media = { type: 'image' | 'video'; src: string; caption?: string; poster?: string; loop?: boolean }

/**
 * The article chapter — a light panel over the dark stage.
 *
 * Three parts, ported from the blog renderer:
 *   · a hero image beside the prose, filling ~85vh, side alternating with `align`
 *   · a wrapped row of media images on light ground beneath
 *   · full-width videos in the scroll, which play only while on screen
 *
 * This is where Brooks Range keeps almost all of its photographs — 10 hero
 * images and 37 in `media[]`. Rendering only the text made the story look empty.
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
    <section className="art">
      <div className={`art-main ${align === 'right' ? 'art-main--right' : ''}`}>
        {heroImage && (
          <figure className="art-hero" onClick={() => setOpen(0)}>
            <img src={heroImage.src} alt={heroImage.caption ?? ''} loading="lazy" decoding="async" />
            {heroImage.caption && <figcaption>{heroImage.caption}</figcaption>}
          </figure>
        )}

        <div className="art-body">
          <div className="art-col">
            {subheading && <p className="art-kicker">{subheading}</p>}
            {heading && <h2>{heading}</h2>}
            {stats}
            {text && (
              <div className="art-prose">
                {text.trim().split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="art-strip">
          {images.map((m, i) => (
            <img
              key={i}
              src={m.src}
              alt={m.caption ?? ''}
              loading="lazy"
              decoding="async"
              onClick={() => setOpen(offset + i)}
            />
          ))}
        </div>
      )}

      {videos.map((m, i) => <ScrollVideo key={i} media={m} />)}

      {open !== null && (
        <Lightbox images={lightbox} index={open} onClose={() => setOpen(null)} onNav={setOpen} />
      )}
    </section>
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
    <figure className="art-video">
      <video
        ref={ref}
        src={media.src}
        poster={media.poster}
        loop={media.loop ?? true}
        muted
        playsInline
        preload="none"
        controls
      />
      {media.caption && <figcaption>{media.caption}</figcaption>}
    </figure>
  )
}
