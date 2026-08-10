/**
 * The panorama's scroll maths.
 *
 * The property that matters most is that the reader is always RELEASED —
 * progress reaches 1 and stays there, and the chapter occupies a finite,
 * predictable amount of scroll. A panorama that traps someone is worse than no
 * panorama, and it is not a thing you want to find out by scrolling.
 */
import assert from 'node:assert/strict'
import {
  annotationScreenX,
  annotationVisibility,
  panDistance,
  panProgress,
  scrollHeight,
} from '../lib/panorama.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

console.log('\npanorama\n')

t('pan distance is everything wider than the viewport', () => {
  assert.equal(panDistance(4473, 1440), 3033)
  assert.equal(panDistance(1000, 1440), 0, 'an image narrower than the viewport cannot pan')
})

t('scroll height is one viewport plus the pan', () => {
  assert.equal(scrollHeight(3000, 900), 3900)
  assert.equal(scrollHeight(3000, 900, 0.5), 2400, 'a lower rate pans faster, so costs less scroll')
  assert.equal(scrollHeight(0, 900), 900, 'a non-panning image still occupies one screen')
})

t('progress runs 0 → 1 and CLAMPS at both ends — the reader is always released', () => {
  assert.equal(panProgress(500, 3000), 0, 'below the viewport: not started')
  assert.equal(panProgress(0, 3000), 0, 'pinned at the top: just starting')
  assert.equal(panProgress(-1500, 3000), 0.5)
  assert.equal(panProgress(-3000, 3000), 1)
  assert.equal(panProgress(-9999, 3000), 1, 'scrolled well past: still 1, never beyond')
})

t('progress never leaves 0..1 over a full scroll sweep', () => {
  for (let top = 2000; top > -8000; top -= 37) {
    const p = panProgress(top, 3000)
    assert.ok(p >= 0 && p <= 1, `out of range at top=${top}: ${p}`)
  }
})

t('progress increases monotonically as you scroll down', () => {
  let prev = -1
  for (let top = 1000; top > -5000; top -= 25) {
    const p = panProgress(top, 3000)
    assert.ok(p >= prev, `went backwards at top=${top}`)
    prev = p
  }
})

t('rate scales how much scrolling the pan costs', () => {
  // Half the rate ⇒ the pan completes in half the scroll.
  assert.equal(panProgress(-1500, 3000, 0.5), 1)
  assert.equal(panProgress(-1500, 3000, 1), 0.5)
})

t('an image that cannot pan is inert rather than dividing by zero', () => {
  assert.equal(panProgress(-500, 0), 0)
  assert.ok(Number.isFinite(panProgress(-500, 0)))
})

t('an annotation tracks the image as it pans', () => {
  // Midpoint of a 4000px image, before any pan, sits at 2000.
  assert.equal(annotationScreenX(0.5, 4000, 0), 2000)
  // After panning 1500px left, it has moved 1500px left with the image.
  assert.equal(annotationScreenX(0.5, 4000, 1500), 500)
})

t('annotations fade at the edges and are solid across the middle', () => {
  const vw = 1000
  assert.equal(annotationVisibility(500, vw), 1, 'dead centre')
  assert.equal(annotationVisibility(-10, vw), 0, 'off the left')
  assert.equal(annotationVisibility(1010, vw), 0, 'off the right')
  assert.ok(annotationVisibility(20, vw) > 0 && annotationVisibility(20, vw) < 1, 'fading in')
  assert.ok(annotationVisibility(980, vw) > 0 && annotationVisibility(980, vw) < 1, 'fading out')
})

t('visibility is always a usable opacity', () => {
  for (let x = -200; x <= 1200; x += 7) {
    const v = annotationVisibility(x, 1000)
    assert.ok(v >= 0 && v <= 1 && Number.isFinite(v), `bad opacity ${v} at x=${x}`)
  }
})

t('a zero-width viewport does not produce NaN', () => {
  assert.ok(Number.isFinite(annotationVisibility(0, 0)))
})

console.log(`\n${n} passed\n`)
