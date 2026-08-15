/**
 * Precompute the landing page's contour drawings.
 *
 * The figures are iso-lines through a synthetic height field. Extracting them is
 * marching squares over a 132×88 lattice — cheap, but there is no reason to ship
 * that engine to a browser so it can redraw two figures that never change. This
 * runs at build time and emits the finished path strings.
 *
 * The height fields live here rather than in a component because they are the
 * *design*: this is the file you open to move a summit or reshape the bay.
 *
 * Deterministic by construction — the noise is a hash, not an RNG — so the
 * output is byte-identical on every build and a redeploy never silently changes
 * the artwork.
 */

import { writeFileSync } from 'node:fs'
import { chaikin, contour, sampleField, simplify, smoothNoise, toPath } from '../lib/contour.ts'

// Finer than the eye needs on its own — the point is that Chaikin has a better
// polyline to round off, so the smoothing follows the real iso-line instead of
// rounding the grid's staircase into a different shape.
const GRID = { cols: 132, rows: 88 }
const VIEW = { w: 300, h: 200 }
/** Minimum contour length, in grid units. Below this it is a speck, not a line. */
const MIN_LENGTH = 3.5
/** Corner-cutting passes. Two is enough to lose the facets; more only costs points. */
const SMOOTHING = 3
/** Douglas–Peucker tolerance, in GRID units, applied after smoothing. */
const SIMPLIFY = 0.06

const OUT = 'lib/landscapes.generated.json'

const gauss = (
  x: number, y: number, cx: number, cy: number, rx: number, ry: number, h: number,
) => h * Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2))

/** Three summits, the largest off-centre, and a smaller shoulder at the left. */
function mountainHeight(x: number, y: number): number {
  return (
    gauss(x, y, 0.32, 0.54, 0.27, 0.36, 1.0) +
    gauss(x, y, 0.63, 0.62, 0.21, 0.27, 0.74) +
    gauss(x, y, 0.87, 0.46, 0.17, 0.23, 0.46) +
    gauss(x, y, 0.12, 0.78, 0.14, 0.16, 0.30) +
    // Three octaves. The middle one is what stops the contours being smooth
    // ovals — it gives them somewhere to wander, which is most of what reads as
    // "terrain" rather than "blob". The finest octave was fringing the lines on
    // the old coarse grid; at 132×88 it resolves properly.
    0.13 * smoothNoise(x, y, 4, 3) +
    0.055 * smoothNoise(x, y, 8, 7) +
    0.02 * smoothNoise(x, y, 15, 13)
  )
}

/**
 * A bay. Positive is land, negative is sea, so the **zero contour is the
 * coastline** — which is what makes this read as a chart rather than a pattern.
 * Two islands sit offshore as bumps that cross zero on their own.
 */
function coastHeight(x: number, y: number): number {
  const shore = (y - 0.46) * 1.15 + 0.17 * Math.sin(x * Math.PI * 1.7 + 0.4)
  return (
    shore +
    gauss(x, y, 0.36, 0.17, 0.10, 0.075, 0.62) +
    gauss(x, y, 0.66, 0.25, 0.065, 0.055, 0.42) +
    0.085 * smoothNoise(x, y, 5, 11) +
    0.03 * smoothNoise(x, y, 9, 5) +
    0.012 * smoothNoise(x, y, 17, 2)
  )
}

type Level = { level: number; opacity: number; dash?: string }

/**
 * Every third line heavier, the way an index contour is on a real map.
 *
 * Eight intervals: more than this reads as noise at the size it renders, and the
 * drawing sits behind a paragraph at low opacity, so it has to survive fading.
 */
const mountainLevels: Level[] = [0.14, 0.28, 0.42, 0.56, 0.70, 0.84, 0.98, 1.12]
  .map((level, i) => ({ level, opacity: i % 3 === 0 ? 0.6 : 0.3 }))

const coastLevels: Level[] = [
  // Bathymetry — dashed and faint, the way soundings are drawn.
  { level: -0.50, opacity: 0.13, dash: '4 5' },
  { level: -0.34, opacity: 0.16, dash: '4 5' },
  { level: -0.20, opacity: 0.20, dash: '4 5' },
  { level: -0.09, opacity: 0.24, dash: '4 5' },
  // The coastline itself.
  { level: 0, opacity: 0.95 },
  // Land, rising away from the water.
  { level: 0.11, opacity: 0.34 },
  { level: 0.24, opacity: 0.28 },
  { level: 0.38, opacity: 0.40 },
  { level: 0.54, opacity: 0.28 },
  { level: 0.72, opacity: 0.28 },
]

type Line = { d: string; opacity: number; dash?: string }

function build(f: (x: number, y: number) => number, levels: Level[]): Line[] {
  const grid = sampleField(GRID.cols, GRID.rows, f)
  const sx = VIEW.w / (GRID.cols - 1)
  const sy = VIEW.h / (GRID.rows - 1)
  const out: Line[] = []
  for (const { level, opacity, dash } of levels) {
    for (const line of contour(grid, level, MIN_LENGTH)) {
      // Round the corners, then drop the points that rounding made redundant.
      const smooth = simplify(chaikin(line, SMOOTHING), SIMPLIFY)
      out.push({ d: toPath(smooth, sx, sy, 2), opacity, ...(dash ? { dash } : {}) })
    }
  }
  return out
}

const data = {
  view: VIEW,
  mountains: build(mountainHeight, mountainLevels),
  coast: build(coastHeight, coastLevels),
}

writeFileSync(OUT, JSON.stringify(data))

const kb = (JSON.stringify(data).length / 1024).toFixed(1)
console.log(
  `\nDrew ${data.mountains.length} mountain + ${data.coast.length} coast contour(s) → ${OUT} (${kb} KB)\n`,
)
