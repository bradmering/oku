'use client'

import { useState } from 'react'
import FullMap from '../FullMap'
import type { DerivedPin as Pin } from '@/schema/trip'

/**
 * The whole-route card. A frosted panel over the map rather than a solid block —
 * this is the one narrative chapter whose job is to let you *look at the map*,
 * so it covers as little of it as possible.
 */
export default function Overview({
  heading, subheading, text, styleUrl, route, pins,
}: {
  heading?: string
  subheading?: string
  text?: string
  styleUrl?: string
  route?: [number, number][]
  pins?: Pin[]
}) {
  const [full, setFull] = useState(false)

  return (
    <>
      <div className="relative z-10 min-h-screen flex items-end sm:items-center justify-center sm:justify-start px-3 pb-20 sm:px-0 sm:pb-0 sm:py-24 sm:pl-14 pointer-events-none">
        <div className="pointer-events-auto bg-white/85 sm:bg-white/70 backdrop-blur-xl shadow-2xl shadow-black/10 ring-1 ring-white/40 max-w-sm w-full sm:mr-6 p-6 sm:p-8 text-left rounded-2xl max-h-[52vh] sm:max-h-none overflow-y-auto">
          {subheading && (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-2">{subheading}</p>
          )}
          {heading && (
            <h2 className="text-2xl font-bold text-stone-900 mb-3 leading-snug tracking-tight">{heading}</h2>
          )}
          {text && (
            <div className="text-sm text-stone-600 leading-relaxed">
              {text.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
            </div>
          )}

          {route && route.length >= 2 && (
            <button
              onClick={() => setFull(true)}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Explore the map
            </button>
          )}
        </div>
      </div>

      {full && <FullMap styleUrl={styleUrl} route={route} pins={pins} onClose={() => setFull(false)} />}
    </>
  )
}
