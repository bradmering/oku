'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trip, Chapter } from '@/schema/trip'
import { pickCamera, resolve, type Camera } from '@/lib/interpolate'
import Stage from './Stage'
import ChapterView from './chapters'

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

  const stage = trip.stage
  const isMap = stage?.type === 'map'
  const route = (isMap ? stage.route : undefined) as [number, number][] | undefined

  /** Every move resolved into a full camera, each inheriting from the last so a
   *  move that only sets `zoom` doesn't reset the rest. */
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

      // Anchor line, a little above centre. A move is "reached" when its
      // anchor crosses it.
      const line = vh * 0.45
      const tops = keyframes.slice(1).map(({ id }) => {
        const el = anchors.current.get(id)
        return el ? el.getBoundingClientRect().top - line : Number.POSITIVE_INFINITY
      })

      setCamera(pickCamera(keyframes.map((k) => k.cam), tops, vh))
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
  }, [keyframes])

  const hasStage = !!stage

  return (
    <div className={hasStage ? 'story story--staged' : 'story'} ref={wrap}>
      {isMap && (
        <Stage styleUrl={stage.style} route={route} camera={camera} terrain={stage.terrain} />
      )}

      {debug && (
        <div className="hud">
          <div>keyframes <b>{keyframes.length}</b></div>
          <div>center <b>{camera.center[0].toFixed(3)}, {camera.center[1].toFixed(3)}</b></div>
          <div>zoom <b>{camera.zoom.toFixed(2)}</b> · tilt <b>{camera.pitch.toFixed(0)}</b> · brg <b>{camera.bearing.toFixed(0)}</b></div>
          <div>routeProgress <b>{camera.routeProgress.toFixed(3)}</b></div>
          <div>route pts <b>{route?.length ?? 0}</b></div>
        </div>
      )}

      <div className="thread">
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
            <ChapterView key={ch.id} chapter={ch} trip={trip} />
          ),
        )}
      </div>
    </div>
  )
}
