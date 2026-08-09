'use client'

import { useEffect } from 'react'

export interface LightboxImage {
  src: string
  caption?: string
}

export default function Lightbox({
  images,
  index,
  onClose,
  onNav,
}: {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onNav: (index: number) => void
}) {
  const image = images[index]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1)
      if (e.key === 'ArrowRight' && index < images.length - 1) onNav(index + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, images.length, onClose, onNav])

  // Lock the page while open. Without this the scroll-driven camera keeps
  // running behind the overlay, and closing it drops you somewhere else.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center p-12"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {index > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-3"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1) }}
          aria-label="Previous"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {index < images.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-3"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1) }}
          aria-label="Next"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <figure className="m-0 max-w-full max-h-full flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <img src={image.src} alt={image.caption ?? ''} className="max-w-full max-h-[82vh] object-contain" />
        {image.caption && (
          <figcaption className="text-white/70 text-sm italic text-center max-w-3xl">{image.caption}</figcaption>
        )}
      </figure>

      {images.length > 1 && (
        <p className="absolute bottom-5 left-0 right-0 text-center text-white/45 text-xs font-mono">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  )
}
