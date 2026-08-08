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
    <div className="lb" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lb-close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {index > 0 && (
        <button
          className="lb-nav lb-prev"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1) }}
          aria-label="Previous"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {index < images.length - 1 && (
        <button
          className="lb-nav lb-next"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1) }}
          aria-label="Next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <figure className="lb-figure" onClick={(e) => e.stopPropagation()}>
        <img src={image.src} alt={image.caption ?? ''} />
        {image.caption && <figcaption>{image.caption}</figcaption>}
      </figure>

      {images.length > 1 && (
        <p className="lb-count">{index + 1} / {images.length}</p>
      )}
    </div>
  )
}
