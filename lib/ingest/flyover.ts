/**
 * Generate a route flyover — an orientation pass over the whole track before the
 * story starts. See decisions/0018.
 *
 * **The flyover draws nothing.** Its moves set `coordinates`, `zoom`, `tilt` and
 * `bearing` and deliberately omit `routeProgress`, which `resolve()` then
 * inherits from the previous camera. So the line holds wherever it was — at 0,
 * since the flyover comes first — and the story still draws it from the
 * beginning. That is the whole reason the "route progress is monotonic but a
 * flyover must rewind" problem never arises: nothing rewinds because nothing
 * advanced.
 *
 * It is otherwise made of parts that already existed. A flyover IS a run of
 * `move` keyframes with text between them; the only thing missing was something
 * to generate the keyframes, because hand-authoring twenty cameras is the job
 * nobody finishes.
 */

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/** Initial great-circle bearing from `a` to `b`, in degrees clockwise from north. */
export function bearingBetween(a: [number, number], b: [number, number]): number {
  const φ1 = toRad(a[1])
  const φ2 = toRad(b[1])
  const Δλ = toRad(b[0] - a[0])
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export type FlyoverLeg = {
  id: string
  label: string
  points: [number, number][]
}

export type FlyoverOptions = {
  /** Camera frames across the whole flyover, shared out by leg length. */
  frames?: number
  zoom?: number
  tilt?: number
  /** Scroll distance per move, as a multiple of the default. Low on purpose —
   *  a flyover frame is a beat, not a chapter. */
  space?: number
  /** Emit a heading chapter before each leg's frames. */
  annotate?: boolean
}

type Move = {
  id: string
  type: 'move'
  to: { coordinates: [number, number]; zoom: number; tilt: number; bearing: number }
  space?: number
}
type Annotation = { id: string; type: 'article'; heading: string }

const round5 = (n: number) => Number(n.toFixed(5))

/**
 * Share `frames` out across legs in proportion to their length, giving every
 * leg at least two — one frame cannot express a direction of travel.
 */
function allocate(legs: FlyoverLeg[], frames: number): number[] {
  const weights = legs.map((l) => Math.max(l.points.length, 1))
  const total = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => Math.max(2, Math.round((w / total) * frames)))
}

export function buildFlyover(
  legs: FlyoverLeg[],
  opts: FlyoverOptions = {},
): (Move | Annotation)[] {
  const { frames = 16, zoom = 12.5, tilt = 62, space = 0.4, annotate = true } = opts

  const usable = legs.filter((l) => l.points.length >= 2)
  if (!usable.length) return []

  const counts = allocate(usable, frames)
  const out: (Move | Annotation)[] = []

  usable.forEach((leg, li) => {
    if (annotate) {
      // Heading only, no prose. The camera HOLDS while this is on screen —
      // "travels while the map shows, holds while you read" (decisions/0014) —
      // so this is the beat where the reader gets their bearings.
      out.push({ id: `ch_fly_${leg.id}_label`, type: 'article', heading: leg.label })
    }

    const n = counts[li]
    const last = leg.points.length - 1
    // Look far enough ahead that the bearing follows the leg rather than the
    // jitter between two adjacent GPS fixes.
    const lookahead = Math.max(1, Math.floor(last / (n * 2)))

    for (let i = 0; i < n; i++) {
      const idx = Math.round((i / (n - 1)) * last)
      const here = leg.points[idx]
      const ahead = leg.points[Math.min(idx + lookahead, last)]
      // At the final point there is nothing ahead; keep the previous heading
      // rather than snapping to 0°.
      const heading =
        here[0] === ahead[0] && here[1] === ahead[1]
          ? bearingBetween(leg.points[Math.max(idx - lookahead, 0)], here)
          : bearingBetween(here, ahead)

      out.push({
        id: `ch_fly_${leg.id}_${String(i + 1).padStart(2, '0')}`,
        type: 'move',
        to: {
          coordinates: [round5(here[0]), round5(here[1])],
          zoom,
          tilt,
          bearing: Math.round(heading),
          // NO routeProgress — this is the decision. See the header.
        },
        space,
      })
    }
  })

  return out
}
