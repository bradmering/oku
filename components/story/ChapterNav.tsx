'use client'

import { useEffect, useRef, useState } from 'react'
import type { Chapter } from '@/schema/trip'

/**
 * Bottom nav: current position, expandable to the full list, click to jump.
 *
 * **`move` chapters are excluded.** They render nothing and exist only to
 * advance the stage, so listing them would fill the nav with unlabelled entries
 * and make "7 / 30" mean something the reader can't see. The nav's unit is the
 * narrative chapter, not the thread entry — the one place where our flat thread
 * needed a decision rather than a port.
 */

function label(c: Chapter): string {
  switch (c.type) {
    case 'title':
    case 'article':
      return c.heading ?? 'Untitled'
    case 'overview': return c.heading ?? 'Overview'
    case 'logistics': return c.heading ?? 'Logistics'
    case 'parallax-video': return c.heading ?? 'Video'
    case 'splash': return c.heading ?? 'Intro'
    case 'video': return c.caption ?? 'Video'
    case 'gallery': return 'Gallery'
    case 'image': return c.caption ?? 'Image'
    default: return 'Chapter'
  }
}

const sub = (c: Chapter) => ('subheading' in c ? c.subheading : undefined)

export default function ChapterNav({
  chapters,
  activeId,
}: {
  chapters: Chapter[]
  activeId: string | null
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
    setOpen(false)
  }

  const idx = chapters.findIndex((c) => c.id === activeId)
  const active = idx >= 0 ? chapters[idx] : chapters[0]
  if (!active) return null

  return (
    <div ref={root} className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto">
      {open && (
        <div className="absolute bottom-full left-0 right-0 max-h-[60vh] overflow-y-auto bg-stone-900/95 backdrop-blur-md border-t border-stone-800">
          <ul className="max-w-2xl mx-auto py-2">
            {chapters.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => jumpTo(c.id)}
                  className={`w-full flex items-center gap-3 px-6 py-2.5 text-left transition-colors ${
                    c.id === active.id ? 'bg-stone-800/70' : 'hover:bg-stone-800/40'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.id === active.id ? 'bg-ember' : 'bg-stone-600'}`} />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm truncate ${c.id === active.id ? 'text-white font-medium' : 'text-stone-300'}`}>
                      {label(c)}
                    </span>
                    {sub(c) && (
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-stone-500 mt-0.5 truncate">
                        {sub(c)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-stone-900/90 backdrop-blur-md border-t border-stone-800"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-ember shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500 shrink-0">
            {Math.max(idx, 0) + 1} / {chapters.length}
          </span>
          <span className="text-sm text-white font-medium truncate">{label(active)}</span>
        </span>
        <svg
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  )
}
