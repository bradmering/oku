/**
 * Marching squares — iso-lines through a height field.
 *
 * The landing drawings were hand-authored SVG paths, which is placing
 * coordinates rather than drawing, and it showed. Contours are the opposite
 * problem: they are *computed*, so they nest correctly, close around summits and
 * split at saddles for free. You cannot draw a wrong contour if you extract it
 * from a real surface.
 *
 * Pure and deterministic — no `Math.random`, so the same field always yields the
 * same paths and a build never produces a different page than the last one.
 */

export type Pt = [number, number]
/** `grid[y][x]`, sampled on a regular lattice. */
export type Grid = number[][]

/** Where along an edge the level crosses, linearly between two corner heights. */
const cross = (a: number, b: number, level: number) => (level - a) / (b - a)

/**
 * Line segments where `grid` crosses `level`.
 *
 * Coordinates are in GRID space (0..cols-1, 0..rows-1); scale afterwards.
 */
function segments(grid: Grid, level: number): [Pt, Pt][] {
  const rows = grid.length
  const cols = grid[0].length
  const out: [Pt, Pt][] = []

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const tl = grid[y][x]
      const tr = grid[y][x + 1]
      const br = grid[y + 1][x + 1]
      const bl = grid[y + 1][x]

      // Corner bits, clockwise from top-left.
      let code = 0
      if (tl > level) code |= 8
      if (tr > level) code |= 4
      if (br > level) code |= 2
      if (bl > level) code |= 1
      if (code === 0 || code === 15) continue

      const top: Pt = [x + cross(tl, tr, level), y]
      const right: Pt = [x + 1, y + cross(tr, br, level)]
      const bottom: Pt = [x + cross(bl, br, level), y + 1]
      const left: Pt = [x, y + cross(tl, bl, level)]

      switch (code) {
        case 1: case 14: out.push([left, bottom]); break
        case 2: case 13: out.push([bottom, right]); break
        case 3: case 12: out.push([left, right]); break
        case 4: case 11: out.push([top, right]); break
        case 6: case 9:  out.push([top, bottom]); break
        case 7: case 8:  out.push([left, top]); break
        // Saddles. Which way the lines pass is genuinely ambiguous from the
        // corners alone, so break the tie on the cell's average height —
        // otherwise contours cross each other, which no real map does.
        case 5:
        case 10: {
          const centre = (tl + tr + br + bl) / 4
          const high = centre > level
          if ((code === 5) === high) { out.push([left, top]); out.push([bottom, right]) }
          else { out.push([left, bottom]); out.push([top, right]) }
          break
        }
      }
    }
  }
  return out
}

const key = (p: Pt) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`

/**
 * Stitch segments into polylines.
 *
 * Marching squares emits unordered fragments; drawing them as separate paths
 * gives a field of dashes. Joining them end-to-end is what makes a contour read
 * as one continuous line around a hill.
 */
function stitch(segs: [Pt, Pt][]): Pt[][] {
  // Indexed by BOTH endpoints, and walked in both directions.
  //
  // The obvious version — index by start point and walk forward — silently
  // shatters every contour into fragments, because the case table emits the same
  // point order for a case and its inverse, so segment orientation around a ring
  // is not consistent. A ring around a single hill came out as seven pieces, and
  // those pieces are exactly the specks that made the first render look like a
  // printing fault.
  const touching = new Map<string, [Pt, Pt][]>()
  const index = (p: Pt, s: [Pt, Pt]) => {
    const k = key(p)
    const list = touching.get(k)
    if (list) list.push(s)
    else touching.set(k, [s])
  }
  for (const s of segs) { index(s[0], s); index(s[1], s) }

  const used = new Set<[Pt, Pt]>()

  /** Extend a line from its last point for as long as segments connect. */
  const extend = (line: Pt[]) => {
    for (;;) {
      const endKey = key(line[line.length - 1])
      const next = (touching.get(endKey) ?? []).find((s) => !used.has(s))
      if (!next) return
      used.add(next)
      // Either end of the segment may be the one we're attached to.
      line.push(key(next[0]) === endKey ? next[1] : next[0])
      if (key(line[line.length - 1]) === key(line[0])) return   // closed the ring
    }
  }

  const lines: Pt[][] = []
  for (const seed of segs) {
    if (used.has(seed)) continue
    used.add(seed)
    const line: Pt[] = [seed[0], seed[1]]
    extend(line)
    // An open contour — one that runs off the edge of the field — also has a
    // tail behind the seed, so walk the other way too.
    if (key(line[line.length - 1]) !== key(line[0])) {
      line.reverse()
      extend(line)
    }
    if (line.length > 2) lines.push(line)
  }
  return lines
}

/** Total length of a polyline, in grid units. */
export function lineLength(line: Pt[]): number {
  let total = 0
  for (let i = 1; i < line.length; i++) {
    total += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1])
  }
  return total
}

/**
 * Contour polylines at `level`, in grid coordinates.
 *
 * `minLength` drops specks. Filtering on POINT COUNT is not enough — a
 * four-point stub straddling two cells survives that test and renders as a tick
 * mark, and a scatter of tick marks is what made the first topo draft look like
 * a printing fault.
 */
export function contour(grid: Grid, level: number, minLength = 2): Pt[][] {
  return stitch(segments(grid, level)).filter((l) => lineLength(l) >= minLength)
}

/** Sample a height function onto a `cols × rows` lattice spanning 0..1 in both axes. */
export function sampleField(
  cols: number,
  rows: number,
  f: (x: number, y: number) => number,
): Grid {
  const grid: Grid = []
  for (let y = 0; y < rows; y++) {
    const row: number[] = []
    for (let x = 0; x < cols; x++) row.push(f(x / (cols - 1), y / (rows - 1)))
    grid.push(row)
  }
  return grid
}

/**
 * A polyline as an SVG path, smoothed through the midpoints of each span.
 *
 * Marching-squares output is faceted at the grid resolution; quadratics through
 * midpoints round it off without needing a finer (and much heavier) lattice.
 */
export function toPath(line: Pt[], scaleX: number, scaleY: number, places = 1): string {
  const p = (pt: Pt): Pt => [pt[0] * scaleX, pt[1] * scaleY]
  const n = (v: number) => Number(v.toFixed(places))
  if (line.length < 3) {
    const [a, b] = [p(line[0]), p(line[line.length - 1])]
    return `M ${n(a[0])} ${n(a[1])} L ${n(b[0])} ${n(b[1])}`
  }

  const pts = line.map(p)
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

  let d = `M ${n(pts[0][0])} ${n(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const m = mid(pts[i], pts[i + 1])
    d += ` Q ${n(pts[i][0])} ${n(pts[i][1])} ${n(m[0])} ${n(m[1])}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${n(last[0])} ${n(last[1])}`
  return d
}

/** Deterministic value noise — no RNG, so the page is identical on every build. */
export function noise(x: number, y: number, seed = 1): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Smooth deterministic noise, by bilinear blend of the lattice hash. */
export function smoothNoise(x: number, y: number, freq: number, seed = 1): number {
  const fx = x * freq
  const fy = y * freq
  const ix = Math.floor(fx)
  const iy = Math.floor(fy)
  const tx = fx - ix
  const ty = fy - iy
  const s = (t: number) => t * t * (3 - 2 * t)
  const a = noise(ix, iy, seed)
  const b = noise(ix + 1, iy, seed)
  const c = noise(ix, iy + 1, seed)
  const d = noise(ix + 1, iy + 1, seed)
  const u = s(tx)
  const v = s(ty)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}
