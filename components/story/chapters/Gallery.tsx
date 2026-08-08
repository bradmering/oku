'use client'

import { useState } from 'react'
import Lightbox, { type LightboxImage } from '../Lightbox'

/**
 * Five layouts, ported from the blog renderer.
 *
 * They are deliberately different shapes rather than one grid with a column
 * count: `single` and `duo` are full-bleed and full-height, `trio` and `quad`
 * stagger down the page at reading width, and `grid` is a contact sheet on
 * light ground. The variety is the point — it's most of what gives these
 * stories their pacing.
 */
export default function Gallery({
  layout,
  images,
}: {
  layout: 'single' | 'duo' | 'trio' | 'quad' | 'grid'
  images: LightboxImage[]
}) {
  const [open, setOpen] = useState<number | null>(null)
  if (!images?.length) return null

  const Img = ({ img, i }: { img: LightboxImage; i: number }) => (
    <button className="g-img" onClick={() => setOpen(i)} aria-label={img.caption ?? 'Open image'}>
      <img src={img.src} alt={img.caption ?? ''} loading="lazy" decoding="async" />
      <span className="g-scrim" aria-hidden="true" />
      {img.caption && <span className="g-cap">{img.caption}</span>}
    </button>
  )

  return (
    <>
      <div className={`gallery gallery--${layout}`}>
        {layout === 'grid'
          ? images.map((img, i) => (
              <button key={i} className="g-cell" onClick={() => setOpen(i)} aria-label={img.caption ?? 'Open image'}>
                <img src={img.src} alt={img.caption ?? ''} loading="lazy" decoding="async" />
              </button>
            ))
          : images
              .slice(0, layout === 'single' ? 1 : layout === 'duo' ? 2 : layout === 'trio' ? 3 : 4)
              .map((img, i) => <Img key={i} img={img} i={i} />)}
      </div>

      {open !== null && (
        <Lightbox images={images} index={open} onClose={() => setOpen(null)} onNav={setOpen} />
      )}
    </>
  )
}
