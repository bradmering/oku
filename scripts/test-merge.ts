/**
 * Re-ingest must never destroy authored work — decisions/0020.
 *
 * These are the assertions that make the editor safe to use. If any of them
 * regress, the failure mode is silent and expensive: someone spends an evening
 * writing captions and a routine `npm run ingest` erases them.
 */
import assert from 'node:assert/strict'
import { mergeTrip } from '../lib/ingest/merge.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

const media = (id: string, legId: string) => ({ id, src: `/images/x/${id}.webp`, kind: 'image' as const, legId })
const leg = (id: string) => ({
  id, label: id, startedAt: '2026-05-02T14:00:00Z', endedAt: '2026-05-02T22:00:00Z', mode: 'ride' as const,
})

const base = (over: Partial<any> = {}): any => ({
  specVersion: 1, id: 'trip_t', slug: 't', title: 'Generated title',
  dates: { start: '2026-05-02' }, visibility: 'unlisted',
  authors: [{ id: 'a', name: 'Ingest' }],
  sources: { tracks: [], legs: [leg('leg_one')], media: [media('med_a', 'leg_one'), media('med_b', 'leg_one')] },
  chapters: [
    { id: 'ch_move_leg_one', type: 'move', to: { zoom: 12, tilt: 60, bearing: 10 } },
    { id: 'ch_leg_one', type: 'article', heading: 'One', media: [{ mediaId: 'med_a' }, { mediaId: 'med_b' }] },
  ],
  ...over,
})

/** What the author has made of it: prose, a cull, a tuned camera, a new title. */
const authored = (over: Partial<any> = {}): any => base({
  title: 'The story, renamed',
  chapters: [
    { id: 'ch_move_leg_one', type: 'move', to: { zoom: 14.5, tilt: 71, bearing: 233 } },
    {
      id: 'ch_leg_one', type: 'article', heading: 'The first day',
      text: 'Prose the author wrote.',
      media: [{ mediaId: 'med_a', caption: 'A caption' }],   // med_b culled
    },
  ],
  ...over,
})

console.log('\nmerge\n')

t('authored prose, captions and headings survive', () => {
  const { trip } = mergeTrip(base(), authored())
  const art: any = trip.chapters.find((c) => c.id === 'ch_leg_one')
  assert.equal(art.text, 'Prose the author wrote.')
  assert.equal(art.heading, 'The first day')
  assert.equal(art.media[0].caption, 'A caption')
})

t('a culled photo STAYS culled across re-ingest', () => {
  const { trip, report } = mergeTrip(base(), authored())
  const art: any = trip.chapters.find((c) => c.id === 'ch_leg_one')
  assert.equal(art.media.length, 1)
  assert.equal(art.media.find((m: any) => m.mediaId === 'med_b'), undefined)
  assert.equal(report.culledStillCulled, 1)
})

t('a hand-tuned camera survives — the picker\'s output is not overwritten', () => {
  const { trip } = mergeTrip(base(), authored())
  const mv: any = trip.chapters.find((c) => c.id === 'ch_move_leg_one')
  assert.deepEqual(mv.to, { zoom: 14.5, tilt: 71, bearing: 233 })
})

t('a chapter the author DELETED is not resurrected', () => {
  const prev = authored({ chapters: [authored().chapters[1]] })   // move deleted
  const { trip } = mergeTrip(base(), prev)
  assert.equal(trip.chapters.find((c) => c.id === 'ch_move_leg_one'), undefined)
  assert.equal(trip.chapters.length, 1)
})

t('the authored title beats whatever --title the CLI was given', () => {
  const { trip } = mergeTrip(base({ title: 'Generated title' }), authored())
  assert.equal(trip.title, 'The story, renamed')
})

t('sources and stage ARE refreshed — they are ingest\'s to own', () => {
  const gen = base()
  gen.sources.media.push(media('med_c', 'leg_one'))
  gen.stage = { type: 'map', clock: 'scroll', initialView: { zoom: 9 }, route: [[1, 2], [3, 4]] }
  const { trip } = mergeTrip(gen, authored())
  assert.equal(trip.sources!.media.length, 3)
  assert.deepEqual((trip.stage as any).route, [[1, 2], [3, 4]])
})

t('genuinely new media is appended to its leg\'s article', () => {
  const gen = base()
  gen.sources.media.push(media('med_c', 'leg_one'))
  gen.chapters[1].media.push({ mediaId: 'med_c' })
  const { trip, report } = mergeTrip(gen, authored())
  const art: any = trip.chapters.find((c) => c.id === 'ch_leg_one')
  assert.deepEqual(art.media.map((m: any) => m.mediaId), ['med_a', 'med_c'])
  assert.deepEqual(report.appendedMedia, [{ chapterId: 'ch_leg_one', mediaIds: ['med_c'] }])
})

t('new media does NOT resurrect the culled one alongside it', () => {
  const gen = base()
  gen.sources.media.push(media('med_c', 'leg_one'))
  const { trip } = mergeTrip(gen, authored())
  const art: any = trip.chapters.find((c) => c.id === 'ch_leg_one')
  assert.equal(art.media.find((m: any) => m.mediaId === 'med_b'), undefined)
})

t('a new leg brings its chapters, positioned after the preceding leg', () => {
  const gen = base()
  gen.sources.legs.push(leg('leg_two'))
  gen.sources.media.push(media('med_d', 'leg_two'))
  gen.chapters.push(
    { id: 'ch_move_leg_two', type: 'move', to: { zoom: 12 } } as any,
    { id: 'ch_leg_two', type: 'article', heading: 'Two' } as any,
  )
  const { trip, report } = mergeTrip(gen, authored())
  const order = trip.chapters.map((c) => c.id)
  assert.deepEqual(order, ['ch_move_leg_one', 'ch_leg_one', 'ch_move_leg_two', 'ch_leg_two'])
  assert.deepEqual(report.addedChapters.sort(), ['ch_leg_two', 'ch_move_leg_two'])
})

t('the author\'s chapter ORDER is preserved, not the generator\'s', () => {
  const prev = authored({
    chapters: [authored().chapters[1], authored().chapters[0]],   // reversed
  })
  const { trip } = mergeTrip(base(), prev)
  assert.deepEqual(trip.chapters.map((c) => c.id), ['ch_leg_one', 'ch_move_leg_one'])
})

t('a chapter the author added by hand is kept', () => {
  const prev = authored()
  prev.chapters.push({ id: 'ch_mine', type: 'article', heading: 'Written from scratch' })
  const { trip } = mergeTrip(base(), prev)
  assert.ok(trip.chapters.find((c) => c.id === 'ch_mine'))
})

t('new media with no surviving article is reported, not silently dropped', () => {
  const gen = base()
  gen.sources.media.push(media('med_c', 'leg_gone'))
  const { report } = mergeTrip(gen, authored())
  assert.deepEqual(report.unplacedMedia, ['med_c'])
})

t('merging is idempotent — a second run changes nothing', () => {
  const once = mergeTrip(base(), authored()).trip
  const twice = mergeTrip(base(), once).trip
  assert.deepEqual(twice, once)
})

t('the previous document is not mutated', () => {
  const prev = authored()
  const gen = base()
  gen.sources.media.push(media('med_c', 'leg_one'))
  mergeTrip(gen, prev)
  assert.equal((prev.chapters[1] as any).media.length, 1)
})

console.log(`\n${n} passed\n`)
