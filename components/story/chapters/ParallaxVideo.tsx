'use client'

import { useEffect, useRef } from 'react'

/**
 * Parallax video — a pinned clip with text scrolling past it.
 *
 * The mechanic: a tall container, a `sticky` video that stays put for its
 * duration, and a text block in normal flow inside that container so it moves
 * at page speed while the video holds. Budget below.
 *
 * Ported from the blog with one adaptation: it pins below a 56px nav bar that
 * oku doesn't have, so the offset is 0 and the video fills the viewport.
 */

// Text scrolls past over the first zone, the video holds alone for a beat,
// then releases and scrolls off with the page.
const TEXT_VH = 80
const HOLD_VH = 80
const RELEASE_VH = 80
const TOTAL_VH = TEXT_VH + HOLD_VH + RELEASE_VH

type Props = {
  src: string
  poster?: string
  loop?: boolean
  caption?: string
  heading?: string
  subheading?: string
  text?: string
  align?: 'left' | 'right'
  layout?: 'full' | 'split'
}

function useAutoplay() {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() },
      { threshold: 0.1 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return ref
}

function ScrollCue() {
  return (
    <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-1.5 text-white/50 pointer-events-none">
      <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
      <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

/**
 * `responsive` renders as a frosted card on mobile — readable over a full-bleed
 * video — and drops to plain text once the split layout separates them.
 */
function TextContent({ heading, subheading, text, variant }: Pick<Props, 'heading' | 'subheading' | 'text'> & { variant: 'glass' | 'responsive' }) {
  const dual = variant === 'responsive'
  return (
    <>
      {subheading && (
        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-2 ${dual ? 'text-white/70 sm:text-stone-400' : 'text-white/70'}`}>
          {subheading}
        </p>
      )}
      {heading && (
        <h2 className={`text-3xl sm:text-4xl font-bold mb-4 leading-tight tracking-tight text-white ${dual ? 'drop-shadow-sm sm:drop-shadow-none' : 'drop-shadow-sm'}`}>
          {heading}
        </h2>
      )}
      {text?.split(/\n{2,}/).map((p, i) => (
        <p key={i} className={`mb-3 leading-7 text-sm sm:text-base last:mb-0 ${dual ? 'text-white sm:text-stone-700' : 'text-white'}`}>
          {p}
        </p>
      ))}
    </>
  )
}

export default function ParallaxVideo(props: Props) {
  const { src, poster, loop, caption, heading, subheading, text, align, layout } = props
  const videoRef = useAutoplay()
  const isLeft = align !== 'right'
  const hasText = !!(heading || subheading || text)

  const scrim = isLeft
    ? 'bg-gradient-to-r from-black/70 via-black/10 to-transparent'
    : 'bg-gradient-to-l from-black/70 via-black/10 to-transparent'

  if (layout === 'split') {
    return (
      <div className="relative pointer-events-auto bg-black" style={{ height: `${TOTAL_VH}vh` }}>
        <div className={`sticky top-0 h-screen flex z-[15] ${isLeft ? '' : 'sm:flex-row-reverse'}`}>
          {/* Letterboxed from sm: up so portrait clips are never cropped. */}
          <div className="w-full sm:w-[46%] h-full relative overflow-hidden bg-black shrink-0">
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              loop={loop ?? true}
              muted
              playsInline
              preload="none"
              className="absolute inset-0 w-full h-full object-cover sm:object-contain"
            />
            <div className={`absolute inset-0 pointer-events-none sm:hidden ${scrim}`} />
            {caption && (
              <p className="absolute bottom-6 sm:bottom-4 left-6 sm:left-4 right-6 sm:right-4 text-white/60 text-xs italic pointer-events-none">
                {caption}
              </p>
            )}
            <ScrollCue />
          </div>
          <div className="hidden sm:block flex-1 h-full" />
        </div>

        {hasText && (
          <div
            className={`absolute top-0 left-0 right-0 flex items-center px-6 sm:px-16 z-20 ${isLeft ? 'justify-start sm:justify-end' : 'justify-end sm:justify-start'}`}
            style={{ height: `${TEXT_VH}vh` }}
          >
            <div className={`max-w-md pointer-events-none bg-white/65 backdrop-blur-md ring-1 ring-white/10 rounded-2xl shadow-2xl shadow-black/40 px-6 py-6 sm:bg-transparent sm:backdrop-blur-none sm:ring-0 sm:rounded-none sm:shadow-none sm:px-0 sm:py-0 ${isLeft ? 'sm:mr-[8%]' : 'sm:ml-[8%]'}`}>
              <TextContent heading={heading} subheading={subheading} text={text} variant="responsive" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative pointer-events-auto" style={{ height: `${TOTAL_VH}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-black z-[15]">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          loop={loop ?? true}
          muted
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className={`absolute inset-0 pointer-events-none ${scrim}`} />
        {caption && (
          <p className={`absolute bottom-6 ${isLeft ? 'right-6 text-right' : 'left-6 text-left'} max-w-xs text-white/60 text-xs italic drop-shadow pointer-events-none`}>
            {caption}
          </p>
        )}
        <ScrollCue />
      </div>

      {hasText && (
        <div
          className={`absolute top-0 left-0 right-0 flex items-center px-6 sm:px-16 z-20 ${isLeft ? 'justify-start' : 'justify-end'}`}
          style={{ height: `${TEXT_VH}vh` }}
        >
          <div className="max-w-md pointer-events-none bg-black/65 backdrop-blur-md ring-1 ring-white/10 rounded-2xl px-6 py-6 sm:px-8 sm:py-7 shadow-2xl shadow-black/40">
            <TextContent heading={heading} subheading={subheading} text={text} variant="glass" />
          </div>
        </div>
      )}
    </div>
  )
}
