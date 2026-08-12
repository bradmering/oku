import { contour, sampleField, smoothNoise, toPath, type Pt } from '@/lib/contour'

/**
 * The topographic alternative to the hand-drawn ink landscapes.
 *
 * **Nothing here is drawn.** Both figures are iso-lines extracted from a
 * synthetic height field by marching squares, so the contours nest, close around
 * summits and split at saddles because that is what contours of a real surface
 * do. The hand-authored version failed in exactly the places a human hand would
 * not: ridges crossing each other, a symmetric canopy reading as a parasol. A
 * computed contour cannot make those mistakes.
 *
 * It is also on the nose for this project in a way the ink drawings were not —
 * the whole product is terrain, tracks and derived data, and this is a drawing
 * derived from data.
 *
 * Deterministic: the noise is a hash, not an RNG, so every build renders the
 * same page.
 */

const GRID = { cols: 84, rows: 56 }
const VIEW = { w: 300, h: 200 }

const gauss = (
  x: number, y: number, cx: number, cy: number, rx: number, ry: number, h: number,
) => h * Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2))

/** Three summits, largest off-centre, plus enough noise to break the symmetry. */
function mountainHeight(x: number, y: number): number {
  return (
    gauss(x, y, 0.32, 0.54, 0.27, 0.36, 1.0) +
    gauss(x, y, 0.63, 0.62, 0.21, 0.27, 0.74) +
    gauss(x, y, 0.87, 0.46, 0.17, 0.23, 0.46) +
    gauss(x, y, 0.12, 0.78, 0.14, 0.16, 0.30) +
    0.12 * smoothNoise(x, y, 4, 3) +
    // High-frequency noise makes every contour hairy at this scale — the detail
    // lands below one grid cell and just fringes the lines.
    0.035 * smoothNoise(x, y, 9, 7)
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
    0.08 * smoothNoise(x, y, 5, 11) +
    0.02 * smoothNoise(x, y, 10, 5)
  )
}

type Line = { d: string; opacity: number; dash?: string }

function build(
  f: (x: number, y: number) => number,
  levels: { level: number; opacity: number; dash?: string }[],
): Line[] {
  const grid = sampleField(GRID.cols, GRID.rows, f)
  const sx = VIEW.w / (GRID.cols - 1)
  const sy = VIEW.h / (GRID.rows - 1)
  const out: Line[] = []
  for (const { level, opacity, dash } of levels) {
    // 2.2 grid units of minimum length drops the specks; see lib/contour.ts.
    for (const line of contour(grid, level, 2.2)) {
      out.push({ d: toPath(line as Pt[], sx, sy), opacity, dash })
    }
  }
  return out
}

/**
 * Every third line heavier, the way an index contour is on a real map.
 *
 * Eight intervals rather than the first draft's eleven — that many lines over
 * this much relief read as noise at the size this actually renders.
 */
const mountainLevels = [0.14, 0.28, 0.42, 0.56, 0.70, 0.84, 0.98, 1.12]
  .map((level, i) => ({ level, opacity: i % 3 === 0 ? 0.6 : 0.3 }))

const coastLevels = [
  // Bathymetry — dashed and faint, the way soundings are drawn.
  { level: -0.50, opacity: 0.13, dash: '4 5' },
  { level: -0.34, opacity: 0.16, dash: '4 5' },
  { level: -0.20, opacity: 0.2, dash: '4 5' },
  { level: -0.09, opacity: 0.24, dash: '4 5' },
  // The coastline itself.
  { level: 0, opacity: 0.95 },
  // Land, rising away from the water.
  { level: 0.11, opacity: 0.34 },
  { level: 0.24, opacity: 0.28 },
  { level: 0.38, opacity: 0.4 },
  { level: 0.54, opacity: 0.28 },
  { level: 0.72, opacity: 0.28 },
]

// Computed once at module load, not per render.
const MOUNTAIN_LINES = build(mountainHeight, mountainLevels)
const COAST_LINES = build(coastHeight, coastLevels)

const ink = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

function Figure({ lines }: { lines: Line[] }) {
  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="w-full h-auto" role="img">
      {lines.map((l, i) => (
        <path key={i} {...ink} d={l.d} opacity={l.opacity}
          {...(l.dash ? { strokeDasharray: l.dash } : {})} />
      ))}
    </svg>
  )
}

export function TopoMountains() { return <Figure lines={MOUNTAIN_LINES} /> }
export function TopoCoast() { return <Figure lines={COAST_LINES} /> }

/** How many paths each figure costs, for the comparison write-up. */
export const TOPO_STATS = {
  mountains: MOUNTAIN_LINES.length,
  coast: COAST_LINES.length,
}
