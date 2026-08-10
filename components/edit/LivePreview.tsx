'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trip } from '@/schema/trip'
import { resolveMedia } from '@/lib/resolve-media'
import { derivePins } from '@/lib/derive-pins'
import Story from '@/components/story/Story'
import { CANVAS_CSS, decorate } from './canvas'

/**
 * The live preview's inside — it runs in an iframe, alone in its own viewport.
 *
 * The renderer is built on `position: fixed`, `window.scrollY` and
 * `document.documentElement.scrollHeight`. Those are whole-viewport assumptions,
 * and every one of them breaks in a side pane. An iframe hands the real
 * components a real window, so **the preview runs the shipping code path
 * unmodified** — a preview through a special rendering mode isn't a preview.
 *
 * The document arrives by postMessage from the editor rather than by reloading,
 * so the Mapbox instance survives every keystroke.
 *
 * `resolveMedia` + `derivePins` run here, at runtime, exactly as the bake runs
 * them — which is the use `decisions/0016` had in mind when it made resolution a
 * pure function instead of a build step.
 */

export const EDITOR_MESSAGE = 'oku-editor'

export type EditorMessage =
  | { source: typeof EDITOR_MESSAGE; kind: 'doc'; trip: Trip }
  | { source: typeof EDITOR_MESSAGE; kind: 'scrollTo'; chapterId: string }
  | { source: typeof EDITOR_MESSAGE; kind: 'selected'; chapterId: string | null }

/** Sent back UP to the editor — the canvas is an input, not just a mirror. */
export type PreviewMessage =
  | { source: typeof EDITOR_MESSAGE; kind: 'ready' }
  | { source: typeof EDITOR_MESSAGE; kind: 'select'; chapterId: string }
  | { source: typeof EDITOR_MESSAGE; kind: 'edit'; chapterId: string; field: string; value: string }

export default function LivePreview({ initial }: { initial: Trip }) {
  const [doc, setDoc] = useState<Trip>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const post = useRef((msg: Record<string, unknown>) => {
    window.parent?.postMessage({ source: EDITOR_MESSAGE, ...msg }, window.location.origin)
  }).current

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Same-origin only. The editor is a dev tool, but a preview that accepts a
      // document from anywhere is a habit worth not forming.
      if (e.origin !== window.location.origin) return
      const msg = e.data as EditorMessage
      if (msg?.source !== EDITOR_MESSAGE) return

      if (msg.kind === 'doc') setDoc(msg.trip)
      if (msg.kind === 'selected') setSelectedId(msg.chapterId)
      if (msg.kind === 'scrollTo') {
        document.getElementById(msg.chapterId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    window.addEventListener('message', onMessage)
    // Tell the editor we're ready, so a document sent before this frame loaded
    // isn't lost to a race.
    window.parent?.postMessage({ source: EDITOR_MESSAGE, kind: 'ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const teardown = useRef<(() => void) | null>(null)

  const { trip, issues } = useMemo(() => {
    const pins = derivePins(doc)
    const resolved = resolveMedia(doc)
    if (pins.length && resolved.trip.stage?.type === 'map') {
      ;(resolved.trip.stage as typeof resolved.trip.stage & { pins: typeof pins }).pins = pins
    }
    return { trip: resolved.trip, issues: resolved.issues }
  }, [doc])

  // Decorate after every render of the story, and tear down completely first —
  // the DOM it hangs off is replaced whenever the document changes.
  useEffect(() => {
    const id = setTimeout(() => {
      teardown.current?.()
      teardown.current = decorate(document, selectedId, {
        onSelect: (chapterId) => { setSelectedId(chapterId); post({ kind: 'select', chapterId }) },
        onEdit: (chapterId, field, value) => post({ kind: 'edit', chapterId, field, value }),
      })
    }, 0)
    return () => clearTimeout(id)
  }, [trip, selectedId, post])

  useEffect(() => () => teardown.current?.(), [])

  return (
    <>
      <style>{CANVAS_CSS}</style>
      {/* A broken reference would otherwise show as a missing image with no
          explanation. Surfacing it here is the fastest feedback available. */}
      {issues.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[60] px-4 py-2 bg-red-950/95 border-b border-red-500/40 font-mono text-[11px] text-red-200">
          {issues.length} unresolved media reference{issues.length === 1 ? '' : 's'} — {issues[0].path}: {issues[0].message}
        </div>
      )}
      <Story trip={trip} />
    </>
  )
}
