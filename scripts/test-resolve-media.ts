/**
 * Unit tests for media reference resolution — decisions/0016.
 *
 * The fixture proves the happy path renders. These prove the REJECTIONS, which a
 * fixture can't: a fixture that fails validation on purpose would just fail the
 * build. "Exactly one of src/mediaId" and dangling ids are the whole reason this
 * logic sits in a resolver instead of in Zod, so they need direct coverage.
 */
import assert from 'node:assert/strict'
import { resolveMedia } from '../lib/resolve-media.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

/** A minimal valid trip with one image and one video in sources. */
const trip = (chapters: unknown[]): any => ({
  specVersion: 1,
  id: 'trip_test',
  slug: 'test',
  title: 'Test',
  dates: { start: '2026-05-02' },
  authors: [{ id: 'a', name: 'A' }],
  visibility: 'unlisted',
  sources: {
    tracks: [],
    legs: [],
    media: [
      { id: 'med_img', src: '/images/a.webp', kind: 'image' },
      { id: 'med_vid', src: '/videos/b.mp4', kind: 'video', poster: '/videos/b.jpg' },
      { id: 'med_aud', src: '/audio/c.m4a', kind: 'audio' },
    ],
  },
  chapters,
})

const messages = (doc: any) => resolveMedia(doc).issues.map((i) => i.message)

console.log('\nresolve-media\n')

t('mediaId resolves to the item’s src and the id is removed', () => {
  const { trip: out, issues } = resolveMedia(
    trip([{ id: 'c', type: 'gallery', layout: 'single', images: [{ mediaId: 'med_img' }] }]),
  )
  assert.deepEqual(issues, [])
  assert.equal((out.chapters[0] as any).images[0].src, '/images/a.webp')
  assert.ok(!('mediaId' in (out.chapters[0] as any).images[0]))
})

t('a dangling mediaId is an issue, not a silent drop', () => {
  const m = messages(trip([{ id: 'c', type: 'gallery', layout: 'single', images: [{ mediaId: 'nope' }] }]))
  assert.equal(m.length, 1)
  assert.match(m[0], /not in sources\.media/)
})

t('a dangling imageId is an issue too', () => {
  const m = messages(trip([{ id: 'c', type: 'image', imageId: 'nope' }]))
  assert.equal(m.length, 1)
  assert.match(m[0], /not in sources\.media/)
})

t('imageId resolves and is removed', () => {
  const { trip: out, issues } = resolveMedia(trip([{ id: 'c', type: 'image', imageId: 'med_img' }]))
  assert.deepEqual(issues, [])
  assert.equal((out.chapters[0] as any).image, '/images/a.webp')
  assert.ok(!('imageId' in (out.chapters[0] as any)))
})

t('src and mediaId together is an issue — exactly one', () => {
  const m = messages(trip([
    { id: 'c', type: 'gallery', layout: 'single', images: [{ src: '/x.webp', mediaId: 'med_img' }] },
  ]))
  assert.equal(m.length, 1)
  assert.match(m[0], /both src .* and mediaId/)
})

t('neither src nor mediaId is an issue', () => {
  const m = messages(trip([{ id: 'c', type: 'gallery', layout: 'single', images: [{ caption: 'orphan' }] }]))
  assert.equal(m.length, 1)
  assert.match(m[0], /neither src nor mediaId/)
})

t('a title with no image at all is fine — text and route layouts have none', () => {
  assert.deepEqual(messages(trip([{ id: 'c', type: 'title', layout: 'text', heading: 'Hi' }])), [])
})

t('but a splash with no image is an issue', () => {
  const m = messages(trip([{ id: 'c', type: 'splash' }]))
  assert.equal(m.length, 1)
  assert.match(m[0], /neither src nor mediaId/)
})

t('article media type is filled from the item’s kind', () => {
  const { trip: out, issues } = resolveMedia(
    trip([{ id: 'c', type: 'article', media: [{ mediaId: 'med_img' }, { mediaId: 'med_vid' }] }]),
  )
  assert.deepEqual(issues, [])
  assert.equal((out.chapters[0] as any).media[0].type, 'image')
  assert.equal((out.chapters[0] as any).media[1].type, 'video')
})

t('an explicit type is not overwritten', () => {
  const { trip: out } = resolveMedia(
    trip([{ id: 'c', type: 'article', media: [{ mediaId: 'med_vid', type: 'image' }] }]),
  )
  assert.equal((out.chapters[0] as any).media[0].type, 'image')
})

t('audio in an article media strip is an issue', () => {
  const m = messages(trip([{ id: 'c', type: 'article', media: [{ mediaId: 'med_aud' }] }]))
  assert.ok(m.some((x) => /audio/.test(x)))
})

t('a literal src with no type is an issue — nothing to infer from', () => {
  const m = messages(trip([{ id: 'c', type: 'article', media: [{ src: '/x.webp' }] }]))
  assert.equal(m.length, 1)
  assert.match(m[0], /no type and no mediaId/)
})

t('poster is inherited from the item, but the reference’s own wins', () => {
  const { trip: out } = resolveMedia(trip([
    { id: 'c1', type: 'video', mediaId: 'med_vid' },
    { id: 'c2', type: 'video', mediaId: 'med_vid', poster: '/mine.webp' },
  ]))
  assert.equal((out.chapters[0] as any).poster, '/videos/b.jpg')
  assert.equal((out.chapters[1] as any).poster, '/mine.webp')
})

t('a document with no sources resolves literal refs untouched', () => {
  const doc = trip([{ id: 'c', type: 'image', image: '/images/hand.webp' }])
  delete doc.sources
  const { trip: out, issues } = resolveMedia(doc)
  assert.deepEqual(issues, [])
  assert.equal((out.chapters[0] as any).image, '/images/hand.webp')
})

t('the input document is not mutated', () => {
  const doc = trip([{ id: 'c', type: 'image', mediaId: 'med_img' }])
  resolveMedia(doc)
  assert.equal(doc.chapters[0].mediaId, 'med_img')
  assert.equal(doc.chapters[0].image, undefined)
})

t('unreferenced media is not an issue — the author disposes', () => {
  assert.deepEqual(messages(trip([{ id: 'c', type: 'title', layout: 'text' }])), [])
})

console.log(`\n${n} passed\n`)
