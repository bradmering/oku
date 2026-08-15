/**
 * The landing drawings' fade.
 *
 * The property that matters is that they go away again — a drawing that fades in
 * and then sits there at full strength behind the next passage is worse than no
 * drawing. That is not something to find out by scrolling.
 */
import assert from 'node:assert/strict'
import { driftX, proximityOpacity } from '../lib/landscape.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

const VH = 900
const H = 300
/** Element top for a given centre position on screen. */
const topFor = (centre: number) => centre - H / 2

console.log('\nlandscape\n')

t('full strength when centred', () => {
  assert.equal(proximityOpacity(topFor(VH / 2), H, VH), 1)
})

t('nothing when far above or far below', () => {
  assert.equal(proximityOpacity(topFor(-VH), H, VH), 0)
  assert.equal(proximityOpacity(topFor(VH * 2), H, VH), 0)
})

t('it FADES OUT again — symmetric either side of centre', () => {
  const above = proximityOpacity(topFor(VH / 2 - 300), H, VH)
  const below = proximityOpacity(topFor(VH / 2 + 300), H, VH)
  assert.ok(above > 0 && above < 1)
  assert.ok(Math.abs(above - below) < 1e-9, 'the fade in and the fade out should match')
})

t('rises then falls across a full pass, never sticking', () => {
  let peak = 0
  let peakAt = 0
  const samples: number[] = []
  for (let centre = VH * 1.8; centre > -VH * 0.8; centre -= 10) {
    const o = proximityOpacity(topFor(centre), H, VH)
    assert.ok(o >= 0 && o <= 1, `out of range: ${o}`)
    samples.push(o)
    if (o > peak) { peak = o; peakAt = centre }
  }
  assert.ok(peak > 0.99, 'should reach full strength somewhere')
  assert.ok(Math.abs(peakAt - VH / 2) < 20, 'peak should be at the middle of the screen')
  assert.equal(samples[0], 0, 'starts hidden')
  assert.equal(samples[samples.length - 1], 0, 'ends hidden')
})

t('eases at both ends rather than ramping linearly', () => {
  // A linear ramp would put the quarter point at exactly 0.25.
  const quarter = proximityOpacity(topFor(VH / 2 + VH * 0.62 * 0.75), H, VH)
  assert.ok(quarter < 0.25, `expected an eased toe, got ${quarter}`)
})

t('a zero-height viewport is hidden, not NaN', () => {
  assert.equal(proximityOpacity(0, H, 0), 0)
  assert.ok(Number.isFinite(proximityOpacity(0, H, 0)))
})

t('drift runs from offset to settled as it comes in', () => {
  assert.equal(driftX(0), 26)
  assert.equal(driftX(1), 0)
  assert.equal(driftX(0.5), 13)
})

console.log(`\n${n} passed\n`)
