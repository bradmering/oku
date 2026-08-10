/**
 * Editing operations on a trip document — pure, immutable, testable.
 *
 * Deliberately separate from the editor UI. The operations are the part that can
 * silently lose someone's work, and they are the part that survives if this ever
 * stops being a local dev tool and becomes a hosted editor: the UI would change
 * entirely, these would not.
 *
 * Every function returns a new document. Nothing mutates its input, so the
 * editor can keep an undo stack for free.
 */

import type { Trip } from '../schema/trip.ts'

type AnyChapter = Record<string, any>

const clone = <T>(v: T): T => structuredClone(v)

function mapChapter(trip: Trip, id: string, fn: (ch: AnyChapter) => void): Trip {
  const out = clone(trip)
  const ch = (out.chapters as AnyChapter[]).find((c) => c.id === id)
  if (ch) fn(ch)
  return out
}

/** Set a scalar field, deleting it when cleared so the document doesn't fill up
 *  with empty strings that then have to be filtered everywhere else. */
export function setField(trip: Trip, chapterId: string, field: string, value: unknown): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    if (value === '' || value === undefined || value === null) delete ch[field]
    else ch[field] = value
  })
}

/** Remove one photo from a chapter's media strip — the cull. */
export function removeMedia(trip: Trip, chapterId: string, index: number): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    if (!Array.isArray(ch.media)) return
    ch.media.splice(index, 1)
    if (!ch.media.length) delete ch.media
  })
}

export function moveMedia(trip: Trip, chapterId: string, from: number, to: number): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    if (!Array.isArray(ch.media)) return
    if (to < 0 || to >= ch.media.length) return
    const [item] = ch.media.splice(from, 1)
    ch.media.splice(to, 0, item)
  })
}

export function setMediaCaption(trip: Trip, chapterId: string, index: number, caption: string): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    const m = ch.media?.[index]
    if (!m) return
    if (caption) m.caption = caption
    else delete m.caption
  })
}

/**
 * Promote a strip photo to the chapter's hero.
 *
 * The outgoing hero returns to the strip rather than being discarded — losing a
 * photograph because you clicked the wrong thumbnail is the kind of small
 * betrayal that stops people trusting an editor.
 */
export function promoteToHero(trip: Trip, chapterId: string, index: number): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    const m = ch.media?.[index]
    if (!m) return
    const previous = ch.heroImage
    ch.media.splice(index, 1)
    ch.heroImage = { ...(m.mediaId ? { mediaId: m.mediaId } : { src: m.src }), ...(m.caption ? { caption: m.caption } : {}) }
    if (previous) {
      ch.media.splice(index, 0, { ...previous, type: 'image' })
    }
    if (!ch.media.length) delete ch.media
  })
}

export function removeChapter(trip: Trip, chapterId: string): Trip {
  const out = clone(trip)
  out.chapters = (out.chapters as AnyChapter[]).filter((c) => c.id !== chapterId) as Trip['chapters']
  return out
}

export function moveChapter(trip: Trip, chapterId: string, delta: number): Trip {
  const out = clone(trip)
  const list = out.chapters as AnyChapter[]
  const i = list.findIndex((c) => c.id === chapterId)
  const j = i + delta
  if (i === -1 || j < 0 || j >= list.length) return trip
  const [ch] = list.splice(i, 1)
  list.splice(j, 0, ch)
  return out
}

// ── panorama annotations ────────────────────────────────────────────────────

export type Annotation = { x: number; y?: number; label: string; note?: string }

export function addAnnotation(trip: Trip, chapterId: string, a: Annotation): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    ch.annotations ??= []
    ch.annotations.push(a)
    // Left to right, so the document reads in the order the reader meets them.
    ch.annotations.sort((p: Annotation, q: Annotation) => p.x - q.x)
  })
}

export function updateAnnotation(
  trip: Trip, chapterId: string, index: number, patch: Partial<Annotation>,
): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    const a = ch.annotations?.[index]
    if (!a) return
    Object.assign(a, patch)
    for (const k of ['note', 'y'] as const) {
      if (a[k] === '' || a[k] === undefined) delete a[k]
    }
    ch.annotations.sort((p: Annotation, q: Annotation) => p.x - q.x)
  })
}

export function removeAnnotation(trip: Trip, chapterId: string, index: number): Trip {
  return mapChapter(trip, chapterId, (ch) => {
    ch.annotations?.splice(index, 1)
    if (!ch.annotations?.length) delete ch.annotations
  })
}

// ── whole-document ──────────────────────────────────────────────────────────

export function setTripField(trip: Trip, field: string, value: unknown): Trip {
  const out = clone(trip) as AnyChapter
  if (value === '' || value === undefined || value === null) delete out[field]
  else out[field] = value
  return out as Trip
}

/** Media in `sources` that no chapter references — what the cull has left over. */
export function unusedMedia(trip: Trip): string[] {
  const used = new Set<string>()
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(walk)
    if (n && typeof n === 'object') {
      const o = n as AnyChapter
      for (const k of ['mediaId', 'imageId']) if (typeof o[k] === 'string') used.add(o[k])
      Object.values(o).forEach(walk)
    }
  }
  walk(trip.chapters)
  return (trip.sources?.media ?? []).map((m) => m.id).filter((id) => !used.has(id))
}
