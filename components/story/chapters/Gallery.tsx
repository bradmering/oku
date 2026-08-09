'use client'

import { useState } from 'react'
import Lightbox, { type LightboxImage } from '../Lightbox'

/**
 * Five layouts, classes ported from the blog.
 *
 * They are deliberately different shapes rather than one grid with a column
 * count: `single` and `duo` are full-bleed and full-height, `trio` and `quad`
 * stagger down the page, and `grid` is a contact sheet on light ground. The
 * variety is most of what gives these stories their pacing.
 */
type Img = LightboxImage

function Cell({ img, onClick, className = '' }: { img: Img; onClick: () => void; className?: string }) {
  return (
    <div className={`relative overflow-hidden cursor-zoom-in ${className}`} onClick={onClick}>
      <img src={img.src} alt={img.caption ?? ''} loading="lazy" decoding="async" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
      {img.caption && (
        <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs italic px-6 pointer-events-none drop-shadow">
          {img.caption}
        </p>
      )}
    </div>
  )
}

export default function Gallery({
  layout,
  images,
}: {
  layout: 'single' | 'duo' | 'trio' | 'quad' | 'grid'
  images: Img[]
}) {
  const [open, setOpen] = useState<number | null>(null)
  if (!images?.length) return null

  return (
    <div className="relative z-10 pointer-events-auto">
      {layout === 'single' && (
        <div className="h-screen">
          <Cell img={images[0]} className="h-full" onClick={() => setOpen(0)} />
        </div>
      )}

      {layout === 'duo' && (
        <div className="h-screen flex gap-0.5">
          {images.slice(0, 2).map((img, i) => (
            <Cell key={i} img={img} className="flex-1" onClick={() => setOpen(i)} />
          ))}
        </div>
      )}

      {layout === 'trio' && (
        <div className="relative py-12 flex flex-col gap-3">
          {images.slice(0, 3).map((img, i) => (
            <div key={i} className={`relative h-[65vh] w-[60%] ${['self-start', 'self-center', 'self-end'][i]}`}>
              <Cell img={img} className="h-full" onClick={() => setOpen(i)} />
            </div>
          ))}
        </div>
      )}

      {layout === 'quad' && (
        <div className="relative py-10 flex flex-col gap-3">
          {images.slice(0, 4).map((img, i) => (
            <div key={i} className={`relative h-[80vh] w-[70%] ${i % 2 === 0 ? 'self-start' : 'self-end'}`}>
              <Cell img={img} className="h-full" onClick={() => setOpen(i)} />
            </div>
          ))}
        </div>
      )}

      {layout === 'grid' && (
        <div className="bg-stone-100 py-10 px-6 sm:px-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-w-5xl mx-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setOpen(i)}
                className="relative aspect-square overflow-hidden group cursor-zoom-in block"
              >
                <img
                  src={img.src}
                  alt={img.caption ?? ''}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {open !== null && (
        <Lightbox images={images} index={open} onClose={() => setOpen(null)} onNav={setOpen} />
      )}
    </div>
  )
}
