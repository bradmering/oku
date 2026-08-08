import type { Keyframe } from '@/schema/trip'

/**
 * Interpolation between keyframes — the heart of the new model.
 *
 * A `move` chapter is a KEYFRAME, not a trigger. The reader's scroll position
 * between two consecutive moves drives the camera and the route line
 * continuously, so the line draws smoothly instead of snapping when some
 * chapter happens to enter the viewport. See decisions/0012.
 */

export type Camera = {
  center: [number, number]
  zoom: number
  pitch: number      // maplibre's name for camera tilt; our schema calls it `tilt`
  bearing: number
  routeProgress: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Shortest-path angular interpolation, so a bearing crossing 0° doesn't spin
 *  the long way round.
 *
 *  At exactly 180° apart the direction is genuinely ambiguous — both ways are
 *  equal. `blend` short-circuits the endpoints so landing on a keyframe still
 *  returns it exactly rather than an equivalent-but-different number. */
function lerpAngle(a: number, b: number, t: number) {
  const d = ((b - a) % 360 + 540) % 360 - 180
  return a + d * t
}

export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

/** Fill a partial keyframe from the previous camera, so a move that only sets
 *  `zoom` doesn't reset the rest. */
export function resolve(kf: Keyframe, prev: Camera): Camera {
  return {
    center: (kf.coordinates as [number, number]) ?? prev.center,
    zoom: kf.zoom ?? prev.zoom,
    pitch: kf.tilt ?? prev.pitch,
    bearing: kf.bearing ?? prev.bearing,
    routeProgress: kf.routeProgress ?? prev.routeProgress,
  }
}

export function blend(a: Camera, b: Camera, tRaw: number, ease = true): Camera {
  // Exact at the endpoints. Cheaper, and it guarantees that sitting on a
  // keyframe reproduces it precisely instead of a recomputed equivalent.
  if (tRaw <= 0) return a
  if (tRaw >= 1) return b
  const t = ease ? easeInOut(tRaw) : tRaw
  return {
    center: [lerp(a.center[0], b.center[0], t), lerp(a.center[1], b.center[1], t)],
    zoom: lerp(a.zoom, b.zoom, t),
    pitch: lerp(a.pitch, b.pitch, t),
    bearing: lerpAngle(a.bearing, b.bearing, t),
    routeProgress: lerp(a.routeProgress, b.routeProgress, t),
  }
}

/** The visible head of the route at a given progress, with the final vertex
 *  interpolated so the line grows continuously rather than vertex-by-vertex. */
export function routeHead(route: [number, number][], progress: number): [number, number][] {
  if (route.length < 2) return route
  const p = Math.min(1, Math.max(0, progress))
  if (p <= 0) return []
  const exact = p * (route.length - 1)
  const i = Math.floor(exact)
  const frac = exact - i
  const head = route.slice(0, i + 1)
  if (i + 1 < route.length && frac > 0) {
    const [x1, y1] = route[i]
    const [x2, y2] = route[i + 1]
    head.push([lerp(x1, x2, frac), lerp(y1, y2, frac)])
  }
  return head
}

/**
 * Pick the camera for a given scroll state.
 *
 * Pure on purpose. The component only supplies geometry — each move anchor's
 * offset from the anchor line, and the viewport height — so the decision of
 * *which pair of keyframes we are between, and how far* is testable without a
 * browser. That matters: the DOM path depends on layout and rAF, neither of
 * which is available in a headless check.
 *
 * `tops[j]` is the distance from the anchor line to keyframe `j + 1`'s anchor:
 * negative once passed, positive while still ahead. `cams[0]` is the initial
 * view, so `cams[j + 1]` pairs with `tops[j]`.
 */
export function pickCamera(cams: Camera[], tops: number[], vh: number): Camera {
  if (cams.length < 2 || !vh) return cams[0]

  let i = 0
  while (i < tops.length && tops[i] <= 0) i++

  // Approaching the first move — ease out of the initial view.
  if (i === 0) {
    const t = 1 - Math.min(1, Math.max(0, tops[0] / vh))
    return blend(cams[0], cams[1], t)
  }

  // Past the last move — hold it.
  if (i >= tops.length) return cams[cams.length - 1]

  const from = tops[i - 1]   // ≤ 0, passed
  const to = tops[i]         // > 0, ahead
  const t = from === to ? 1 : (0 - from) / (to - from)
  return blend(cams[i], cams[i + 1], t)
}
