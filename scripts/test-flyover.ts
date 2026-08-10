/**
 * The flyover's defining property is a NEGATIVE one — it must never emit
 * `routeProgress` — and negatives are exactly what rots silently. Someone adding
 * "helpful" progress to the generator would reintroduce the rewind problem
 * decisions/0018 exists to avoid, and nothing else in the suite would notice.
 */
import assert from 'node:assert/strict'
import { buildFlyover, bearingBetween, type FlyoverLeg } from '../lib/ingest/flyover.ts'
import { Chapter } from '../schema/trip.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

/** A leg running due north, then one running due east. */
const north: FlyoverLeg = {
  id: 'north',
  label: 'Northbound',
  points: Array.from({ length: 50 }, (_, i) => [-110, 38 + i * 0.01] as [number, number]),
}
const east: FlyoverLeg = {
  id: 'east',
  label: 'Eastbound',
  points: Array.from({ length: 50 }, (_, i) => [-110 + i * 0.01, 38] as [number, number]),
}

const moves = (cs: ReturnType<typeof buildFlyover>) => cs.filter((c) => c.type === 'move')

console.log('\nflyover\n')

t('never emits routeProgress — the whole decision', () => {
  const cs = buildFlyover([north, east], { frames: 12 })
  assert.ok(moves(cs).length > 0)
  for (const m of moves(cs)) {
    assert.ok(!('routeProgress' in (m as { to: object }).to), `${m.id} carries routeProgress`)
  }
})

t('every chapter it emits validates against the schema', () => {
  for (const c of buildFlyover([north, east], { frames: 10 })) {
    const r = Chapter.safeParse(c)
    assert.ok(r.success, `${c.id}: ${r.success ? '' : JSON.stringify(r.error.issues)}`)
  }
})

t('moves carry a fractional space — a frame is a beat, not a chapter', () => {
  for (const m of moves(buildFlyover([north], { frames: 6 }))) {
    assert.equal((m as { space?: number }).space, 0.4)
  }
  for (const m of moves(buildFlyover([north], { frames: 6, space: 0.25 }))) {
    assert.equal((m as { space?: number }).space, 0.25)
  }
})

t('bearing follows the direction of travel', () => {
  const [n1] = moves(buildFlyover([north], { frames: 6, annotate: false })) as { to: { bearing: number } }[]
  assert.ok(Math.abs(n1.to.bearing - 0) < 5 || Math.abs(n1.to.bearing - 360) < 5, `north got ${n1.to.bearing}`)
  const [e1] = moves(buildFlyover([east], { frames: 6, annotate: false })) as { to: { bearing: number } }[]
  assert.ok(Math.abs(e1.to.bearing - 90) < 5, `east got ${e1.to.bearing}`)
})

t('the last frame keeps a heading rather than snapping to 0', () => {
  const ms = moves(buildFlyover([east], { frames: 5, annotate: false })) as { to: { bearing: number } }[]
  assert.ok(Math.abs(ms[ms.length - 1].to.bearing - 90) < 5)
})

t('a label precedes each leg, and only when asked', () => {
  const withLabels = buildFlyover([north, east], { frames: 8 })
  assert.deepEqual(
    withLabels.filter((c) => c.type === 'article').map((c) => (c as { heading: string }).heading),
    ['Northbound', 'Eastbound'],
  )
  assert.equal(withLabels[0].type, 'article')
  assert.equal(buildFlyover([north, east], { frames: 8, annotate: false }).some((c) => c.type === 'article'), false)
})

t('frames are shared by leg length, with a floor of two', () => {
  const long = { ...north, id: 'long', points: north.points.concat(north.points) }
  const short: FlyoverLeg = { id: 'short', label: 'Short', points: east.points.slice(0, 2) }
  const cs = buildFlyover([long, short], { frames: 20, annotate: false })
  const perLeg = (id: string) => moves(cs).filter((m) => m.id.includes(`_${id}_`)).length
  assert.ok(perLeg('long') > perLeg('short'), 'longer leg should get more frames')
  assert.ok(perLeg('short') >= 2, 'every leg needs at least two frames to express direction')
})

t('legs too short to have a direction are skipped', () => {
  assert.deepEqual(buildFlyover([{ id: 'x', label: 'X', points: [[0, 0]] }], { frames: 4 }), [])
  assert.deepEqual(buildFlyover([], { frames: 4 }), [])
})

t('ids are unique across the whole flyover', () => {
  const ids = buildFlyover([north, east], { frames: 14 }).map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
})

t('bearingBetween agrees with the compass', () => {
  assert.equal(Math.round(bearingBetween([0, 0], [0, 1])), 0)     // north
  assert.equal(Math.round(bearingBetween([0, 0], [1, 0])), 90)    // east
  assert.equal(Math.round(bearingBetween([0, 0], [0, -1])), 180)  // south
  assert.equal(Math.round(bearingBetween([0, 0], [-1, 0])), 270)  // west
})

console.log(`\n${n} passed\n`)
