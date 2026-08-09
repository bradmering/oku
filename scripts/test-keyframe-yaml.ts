/**
 * The camera picker's output has to parse AND validate. Checking it against the
 * real schema is the only assertion that matters — YAML that looks right and
 * fails `npm test` after you paste it is the exact time-waste the tool exists
 * to remove.
 */
import assert from 'node:assert/strict'
import { load as yamlLoad } from 'js-yaml'
import { keyframeYaml, type CameraReading } from '../lib/keyframe-yaml.ts'
import { Keyframe, Chapter } from '../schema/trip.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

const reading: CameraReading = {
  coordinates: [-109.79376, 38.40179],
  zoom: 12,
  tilt: 50,
  bearing: 0,
  routeProgress: 0.3767,
}

console.log('\nkeyframe-yaml\n')

t('the bare form parses and validates as a Keyframe', () => {
  const doc = yamlLoad(keyframeYaml(reading)) as { to: unknown }
  const r = Keyframe.safeParse(doc.to)
  assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues))
  assert.deepEqual(r.data!.coordinates, [-109.79376, 38.40179])
  assert.equal(r.data!.routeProgress, 0.3767)
})

t('the move form parses and validates as a Chapter', () => {
  const doc = yamlLoad(keyframeYaml(reading, 'ch_move_test')) as unknown[]
  assert.equal(doc.length, 1)
  const r = Chapter.safeParse(doc[0])
  assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues))
  assert.equal((r.data as { id: string }).id, 'ch_move_test')
})

t('negative longitude is not mangled into a YAML tag or string', () => {
  const doc = yamlLoad(keyframeYaml(reading)) as { to: { coordinates: unknown[] } }
  assert.equal(typeof doc.to.coordinates[0], 'number')
  assert.ok((doc.to.coordinates[0] as number) < 0)
})

t('the extremes the schema rejects would be caught', () => {
  // tilt is capped at 85 — the picker can't produce more, but if it ever did
  // the paste would fail validation rather than render a broken camera.
  const bad = yamlLoad(keyframeYaml({ ...reading, tilt: 95 })) as { to: unknown }
  assert.equal(Keyframe.safeParse(bad.to).success, false)
})

t('routeProgress 0 and 1 both survive the round trip', () => {
  for (const p of [0, 1]) {
    const doc = yamlLoad(keyframeYaml({ ...reading, routeProgress: p })) as { to: unknown }
    const r = Keyframe.safeParse(doc.to)
    assert.ok(r.success)
    assert.equal(r.data!.routeProgress, p)
  }
})

console.log(`\n${n} passed\n`)
