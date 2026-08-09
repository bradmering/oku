'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trip, Chapter } from '@/schema/trip'
import { pickCamera, resolve, type Camera } from '@/lib/interpolate'
import Stage from './Stage'
import ChapterView from './chapters'
import ChapterNav from './ChapterNav'
import ReadingProgress from './ReadingProgress'

/**
 * The thread, and the scroll→camera binding.
 *
 * Moves are keyframes anchored in the document. On every frame we find which
 * pair of moves the reader is between, compute t from scroll position, and blend
 * the two cameras. Nothing is triggered; the camera is a pure function of scroll.
 */
export default function Story({ trip }: { trip: Trip }) {
  const wrap = useRef<HTMLDivElement>(null)
  const anchors = useRef<Map<string, HTMLElement>>(new Map())
  const chapterEls = useRef<Map<string, HTMLElement>>(new Map())

  /** Nav lists narrative chapters only — moves render nothing. See ChapterNav. */
  const navChapters = useMemo(() => trip.chapters.filter((c) => c.type !== 'move'), [trip])
  const [activeId, setActiveId] = useState<string | null>(null)

  const stage = trip.stage
  const isMap = stage?.type === 'map'
  const route = (isMap ? stage.route : undefined) as [number, number][] | undefined

  /**
   * Every keyframe, resolved into a full camera, each inheriting from the last
   * so a move that only sets `zoom` doesn't reset the rest.
   *
   * A `title` with `layout: 'route'` contributes one too: it holds over the map
   * while the whole route draws. That is the single place a presentation drives
   * the stage — see decisions/0015 for why it earns the exception.
   */
  const keyframes = useMemo(() => {
    const initial: Camera = {
      center: (isMap ? stage.initialView.coordinates : [0, 0]) as [number, number],
      zoom: (isMap ? stage.initialView.zoom : 2) ?? 2,
      pitch: (isMap ? stage.initialView.tilt : 0) ?? 0,
      bearing: (isMap ? stage.initialView.bearing : 0) ?? 0,
      routeProgress: 0,
    }
    const out: { id: string; cam: Camera }[] = [{ id: '__initial', cam: initial }]
    let prev = initial
    for (const ch of trip.chapters) {
      if (ch.type === 'title' && ch.layout === 'route') {
        // Hold the opening framing and draw the whole line.
        const cam = { ...prev, routeProgress: 1 }
        out.push({ id: ch.id, cam })
        prev = cam
        continue
      }
      if (ch.type !== 'move') continue
      const cam = resolve(ch.to, prev)
      out.push({ id: ch.id, cam })
      prev = cam
    }
    return out
  }, [trip, isMap, stage])

  const [camera, setCamera] = useState<Camera>(keyframes[0].cam)
  const [debug, setDebug] = useState(false)
  useEffect(() => { setDebug(new URLSearchParams(location.search).has('debug')) }, [])

  useEffect(() => {
    let queued = false

    const update = () => {
      queued = false
      if (keyframes.length < 2) return
      const vh = window.innerHeight
      if (!vh) return   // not laid out yet (hidden tab, SSR hydration)

      // Each move anchor's geometry. The camera travels across an anchor's
      // transit and holds otherwise — see pickCamera.
      const spans = keyframes.slice(1).map(({ id }) => {
        const el = anchors.current.get(id)
        if (!el) return { top: Number.POSITIVE_INFINITY, height: 0 }
        const r = el.getBoundingClientRect()
        return { top: r.top, height: r.height }
      })

      setCamera(pickCamera(keyframes.map((k) => k.cam), spans, vh))

      const line = vh * 0.45

      // Active chapter = the last one whose top has passed the same line the
      // camera uses, so the nav and the map agree about where you are.
      let current: string | null = null
      for (const c of navChapters) {
        const el = chapterEls.current.get(c.id)
        if (el && el.getBoundingClientRect().top - line <= 0) current = c.id
      }
      setActiveId(current ?? navChapters[0]?.id ?? null)
    }

    // Coalesce to one update per frame, but drive it from real events rather
    // than a free-running rAF loop: no work when idle, and it still runs when
    // rAF is throttled (hidden tab) as soon as anything moves.
    const onChange = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange)
    const ro = new ResizeObserver(onChange)
    ro.observe(document.documentElement)

    return () => {
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
      ro.disconnect()
    }
  }, [keyframes, navChapters])

  const hasStage = !!stage

  return (
    <div className="relative" ref={wrap}>
      {isMap && (
        <Stage styleUrl={stage.style} route={route} camera={camera} terrain={stage.terrain} pins={stage.pins} />
      )}

      {debug && (
        <div className="fixed top-4 right-4 z-50 px-3 py-2.5 rounded bg-black/85 border border-white/15 font-mono text-[11px] leading-relaxed text-stone-400 [&_b]:text-white [&_b]:font-medium">
          <div>keyframes <b>{keyframes.length}</b></div>
          <div>center <b>{camera.center[0].toFixed(3)}, {camera.center[1].toFixed(3)}</b></div>
          <div>zoom <b>{camera.zoom.toFixed(2)}</b> · tilt <b>{camera.pitch.toFixed(0)}</b> · brg <b>{camera.bearing.toFixed(0)}</b></div>
          <div>routeProgress <b>{camera.routeProgress.toFixed(3)}</b></div>
          <div>route pts <b>{route?.length ?? 0}</b></div>
        </div>
      )}

      <ReadingProgress />
      <ChapterNav chapters={navChapters} activeId={activeId} />

      <div className="relative z-10">
        {trip.chapters.map((ch: Chapter) =>
          ch.type === 'move' ? (
            // Renders nothing. It exists in the flow purely as a scroll anchor —
            // its position in the document is what the interpolation reads.
            <div
              key={ch.id}
              className="move-anchor"
              data-move={ch.id}
              ref={(el) => { if (el) anchors.current.set(ch.id, el) }}
            />
          ) : (
            <div
              key={ch.id}
              id={ch.id}
              ref={(el) => {
                if (!el) return
                chapterEls.current.set(ch.id, el)
                // A route title is its own stage anchor: its tall span is the
                // scroll distance the line draws across.
                if (ch.type === 'title' && ch.layout === 'route') anchors.current.set(ch.id, el)
              }}
            >
              <ChapterView chapter={ch} trip={trip} />
            </div>
          ),
        )}
      </div>
    </div>
  )
}
