/**
 * Unit tests for the interpolation math — the heart of decisions/0012.
 *
 * Verifiable in Node, deliberately: the browser path depends on layout and
 * requestAnimationFrame, so the maths itself needs a test that doesn't.
 */
import assert from 'node:assert/strict'
import { blend, resolve, routeHead, easeInOut, pickCamera, type Camera } from '../lib/interpolate.ts'

const base: Camera = { center: [0, 0], zoom: 4, pitch: 0, bearing: 0, routeProgress: 0 }
let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

console.log('\ninterpolate\n')

t('resolve inherits every field a partial keyframe omits', () => {
  const prev: Camera = { center: [10, 20], zoom: 9, pitch: 45, bearing: 90, routeProgress: 0.5 }
  const r = resolve({ zoom: 12 }, prev)
  assert.deepEqual(r, { center: [10, 20], zoom: 12, pitch: 45, bearing: 90, routeProgress: 0.5 })
})

t('blend at t=0 and t=1 returns the endpoints exactly', () => {
  const b: Camera = { center: [10, 10], zoom: 10, pitch: 60, bearing: 180, routeProgress: 1 }
  assert.deepEqual(blend(base, b, 0), base)
  assert.deepEqual(blend(base, b, 1), b)
})

t('blend clamps outside 0..1 rather than extrapolating', () => {
  const b: Camera = { ...base, zoom: 10 }
  assert.equal(blend(base, b, -5).zoom, 4)
  assert.equal(blend(base, b, 5).zoom, 10)
})

t('bearing takes the short way round 0°', () => {
  const a: Camera = { ...base, bearing: 350 }
  const b: Camera = { ...base, bearing: 10 }
  // 350 → 10 is +20°, not -340°. Halfway is 0/360, not 180.
  const mid = blend(a, b, 0.5, false).bearing
  assert.equal(((mid % 360) + 360) % 360, 0)
})

t('easing is symmetric and pinned at the ends', () => {
  assert.equal(easeInOut(0), 0)
  assert.equal(easeInOut(1), 1)
  assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 1e-9)
})

t('routeHead grows monotonically and interpolates the final vertex', () => {
  const route: [number, number][] = [[0, 0], [10, 0], [20, 0]]
  assert.deepEqual(routeHead(route, 0), [])
  assert.deepEqual(routeHead(route, 1), route)
  // Quarter of the way = halfway along the first of two segments.
  assert.deepEqual(routeHead(route, 0.25), [[0, 0], [5, 0]])
  let prev = 0
  for (let p = 0; p <= 1; p += 0.05) {
    const len = routeHead(route, p).length
    assert.ok(len >= prev, `route head shrank at ${p}`)
    prev = len
  }
})

t('routeHead clamps out-of-range progress', () => {
  const route: [number, number][] = [[0, 0], [1, 1]]
  assert.deepEqual(routeHead(route, -1), [])
  assert.deepEqual(routeHead(route, 99), route)
})

console.log()

console.log('pickCamera — travels while the map shows, holds while you read\n')

const cams: Camera[] = [
  { center: [0, 0], zoom: 5, pitch: 0, bearing: 0, routeProgress: 0 },      // initial
  { center: [10, 0], zoom: 10, pitch: 30, bearing: 0, routeProgress: 0.5 }, // move 1
  { center: [20, 0], zoom: 12, pitch: 60, bearing: 0, routeProgress: 1 },   // move 2
]
const VH = 800
const H = 620   // a 78vh anchor

t('holds the initial view before the first anchor enters', () => {
  assert.deepEqual(pickCamera(cams, [{ top: VH, height: H }, { top: VH * 3, height: H }], VH), cams[0])
})

t('is mid-travel when the anchor is centred — i.e. when the map is visible', () => {
  // Anchor top at 90 ⇒ it fills most of the viewport ⇒ the map is on screen.
  const c = pickCamera(cams, [{ top: 90, height: H }, { top: VH * 2, height: H }], VH)
  assert.ok(c.routeProgress > 0.1 && c.routeProgress < 0.9, `expected mid-draw, got ${c.routeProgress}`)
})

t('completes only once the anchor has left the top', () => {
  assert.deepEqual(pickCamera(cams, [{ top: -H, height: H }, { top: VH * 2, height: H }], VH), cams[1])
})

t('HOLDS between two moves — the regression this model fixes', () => {
  // Anchor 1 gone, anchor 2 far below: a long article is on screen. The camera
  // must not creep forward while the map is hidden behind it.
  const a = pickCamera(cams, [{ top: -H - 100, height: H }, { top: VH * 4, height: H }], VH)
  const b = pickCamera(cams, [{ top: -H - 2000, height: H }, { top: VH * 2, height: H }], VH)
  assert.deepEqual(a, cams[1])
  assert.deepEqual(b, cams[1])
})

t('holds the last keyframe past the end', () => {
  assert.deepEqual(pickCamera(cams, [{ top: -9000, height: H }, { top: -9000, height: H }], VH), cams[2])
})

t('route progress never goes backwards while scrolling down', () => {
  let prev = -1
  for (let scroll = 0; scroll <= 5000; scroll += 25) {
    const c = pickCamera(
      cams,
      [{ top: VH - scroll, height: H }, { top: VH * 3 - scroll, height: H }],
      VH,
    )
    assert.ok(c.routeProgress >= prev - 1e-9, `went backwards at scroll ${scroll}`)
    prev = c.routeProgress
  }
})

t('degrades safely with no viewport or a single keyframe', () => {
  assert.deepEqual(pickCamera(cams, [{ top: 0, height: H }], 0), cams[0])
  assert.deepEqual(pickCamera([cams[0]], [], VH), cams[0])
})

console.log(`\n${n} passed\n`)
