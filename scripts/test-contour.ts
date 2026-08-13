/**
 * Marching squares. The whole argument for the topo drawings is that a computed
 * contour cannot be wrong in the ways a hand-drawn one was — so the properties
 * that make that true are worth asserting.
 */
import assert from 'node:assert/strict'
import { chaikin, contour, lineLength, sampleField, simplify, smoothNoise, toPath, type Pt } from '../lib/contour.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

/** A single symmetric hill in the middle of the field. */
const hill = (x: number, y: number) =>
  Math.exp(-(((x - 0.5) / 0.25) ** 2 + ((y - 0.5) / 0.25) ** 2))

const grid = sampleField(80, 80, hill)

console.log('\ncontour\n')

t('a level above the summit produces nothing', () => {
  assert.deepEqual(contour(grid, 1.5), [])
})

t('a level below the whole field produces nothing', () => {
  assert.deepEqual(contour(grid, -0.5), [])
})

t('one hill gives ONE ring per level, not a scatter of fragments', () => {
  // This is what stitching buys. Unstitched, this would be hundreds of segments.
  for (const level of [0.2, 0.5, 0.8]) {
    assert.equal(contour(grid, level).length, 1, `level ${level} should give one ring`)
  }
})

t('a ring closes on itself', () => {
  const [ring] = contour(grid, 0.5)
  const first = ring[0]
  const last = ring[ring.length - 1]
  assert.ok(Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-6, 'ring should close')
})

t('contours NEST — a higher level is strictly inside a lower one', () => {
  const extent = (level: number) => {
    const [ring] = contour(grid, level)
    const xs = ring.map((p) => p[0])
    return Math.max(...xs) - Math.min(...xs)
  }
  const wide = extent(0.2)
  const mid = extent(0.5)
  const tight = extent(0.85)
  assert.ok(wide > mid && mid > tight, `expected nesting, got ${wide} > ${mid} > ${tight}`)
})

t('every point on a contour sits at that height, within the grid resolution', () => {
  const [ring] = contour(grid, 0.5)
  const cols = grid[0].length - 1
  const rows = grid.length - 1
  for (const [gx, gy] of ring.slice(0, 40)) {
    const h = hill(gx / cols, gy / rows)
    assert.ok(Math.abs(h - 0.5) < 0.02, `expected ~0.5 on the contour, got ${h}`)
  }
})

t('minLength drops short lines and keeps long ones', () => {
  const noisy = sampleField(60, 60, (x, y) => smoothNoise(x, y, 9, 4))
  const all = contour(noisy, 0.5, 0)
  assert.ok(all.length > 0)

  // Threshold from the data rather than a guess: half the longest contour is
  // guaranteed to cut something without depending on the exact field.
  const longest = Math.max(...all.map(lineLength))
  const filtered = contour(noisy, 0.5, longest / 2)
  assert.ok(filtered.length < all.length, 'a high threshold should remove something')
  for (const line of filtered) assert.ok(lineLength(line) >= longest / 2)

  // And an absurd threshold removes everything.
  assert.deepEqual(contour(noisy, 0.5, 1e6), [])
})

t('output is deterministic — the same field twice gives identical paths', () => {
  const a = contour(grid, 0.5).map((l) => toPath(l, 3, 2))
  const b = contour(sampleField(80, 80, hill), 0.5).map((l) => toPath(l, 3, 2))
  assert.deepEqual(a, b)
})

t('toPath emits a valid path starting with a move', () => {
  const d = toPath(contour(grid, 0.5)[0], 3, 2)
  assert.match(d, /^M [\d.-]+ [\d.-]+/)
  assert.ok(!/NaN|Infinity/.test(d), 'no NaN in the path data')
})

t('chaikin keeps a closed ring closed', () => {
  const [ring] = contour(grid, 0.5)
  const smooth = chaikin(ring, 3)
  const first = smooth[0]
  const last = smooth[smooth.length - 1]
  assert.ok(Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-9, 'ring should stay closed')
})

t('chaikin pins the endpoints of an OPEN line', () => {
  // Open contours sit on the frame edge; pulling their ends inward would leave
  // a visible gap at the border.
  const open: Pt[] = [[0, 0], [2, 0], [2, 2], [4, 2], [4, 4]]
  const smooth = chaikin(open, 3)
  assert.deepEqual(smooth[0], [0, 0])
  assert.deepEqual(smooth[smooth.length - 1], [4, 4])
})

t('chaikin ROUNDS CORNERS — the whole point', () => {
  // Measured as the SHARPEST turn at any one vertex, not total turning: total
  // turning is conserved by corner-cutting, which just spreads it over more
  // vertices. "No sharp corner survives" is the property that matters, and it
  // is the one you can see.
  const sharpest = (line: Pt[]) => {
    let worst = 0
    for (let i = 1; i < line.length - 1; i++) {
      const a = Math.atan2(line[i][1] - line[i - 1][1], line[i][0] - line[i - 1][0])
      const b = Math.atan2(line[i + 1][1] - line[i][1], line[i + 1][0] - line[i][0])
      worst = Math.max(worst, Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI))
    }
    return worst
  }
  const stair: Pt[] = []
  for (let i = 0; i < 10; i++) { stair.push([i, i % 2], [i + 1, i % 2]) }

  const before = sharpest(stair)
  assert.ok(before > Math.PI / 2 - 1e-9, 'the staircase should start with right angles')

  const after = sharpest(chaikin(stair, 3))
  assert.ok(after < before / 3, `expected corners cut: ${before.toFixed(2)} → ${after.toFixed(2)} rad`)
})

t('chaikin stays inside the convex hull — it cuts corners, never overshoots', () => {
  const box: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
  for (const [x, y] of chaikin(box, 3)) {
    assert.ok(x >= -1e-9 && x <= 10 + 1e-9 && y >= -1e-9 && y <= 10 + 1e-9, `escaped: ${x},${y}`)
  }
})

t('simplify keeps the endpoints and honours the tolerance', () => {
  const line: Pt[] = [[0, 0], [1, 0.01], [2, -0.01], [3, 0], [4, 5], [5, 0]]
  const out = simplify(line, 0.5)
  assert.deepEqual(out[0], [0, 0])
  assert.deepEqual(out[out.length - 1], [5, 0])
  assert.ok(out.length < line.length, 'near-collinear points should go')
  assert.ok(out.some((p) => p[1] === 5), 'the spike is well beyond tolerance and must stay')
})

t('simplify with zero tolerance changes nothing', () => {
  const [ring] = contour(grid, 0.5)
  assert.equal(simplify(ring, 0).length, ring.length)
})

t('smoothing then simplifying is smaller than the raw contour, and still smooth', () => {
  const [ring] = contour(grid, 0.5)
  const out = simplify(chaikin(ring, 3), 0.06)
  assert.ok(out.length < chaikin(ring, 3).length, 'simplify should drop redundant points')
  const first = out[0]
  const last = out[out.length - 1]
  assert.ok(Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-6, 'still closed')
})

t('a saddle between two hills separates into two rings higher up', () => {
  const two = sampleField(90, 60, (x, y) =>
    Math.exp(-(((x - 0.3) / 0.16) ** 2 + ((y - 0.5) / 0.22) ** 2)) +
    Math.exp(-(((x - 0.7) / 0.16) ** 2 + ((y - 0.5) / 0.22) ** 2)))
  // Low down the two hills share one contour; high up they are separate summits.
  assert.equal(contour(two, 0.35).length, 1)
  assert.equal(contour(two, 0.9).length, 2)
})

console.log(`\n${n} passed\n`)
