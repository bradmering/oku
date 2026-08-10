/**
 * Editing operations. These are the functions that can silently lose work, so
 * the assertions that matter are about what is NOT destroyed.
 */
import assert from 'node:assert/strict'
import {
  addAnnotation, moveChapter, moveMedia, promoteToHero, removeAnnotation,
  removeChapter, removeMedia, setField, setMediaCaption, unusedMedia,
  updateAnnotation,
} from '../lib/edit-ops.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

const doc = (): any => ({
  specVersion: 1, id: 'trip_t', slug: 't', title: 'T',
  dates: { start: '2026-05-02' }, visibility: 'unlisted',
  authors: [{ id: 'a', name: 'A' }],
  sources: {
    tracks: [], legs: [],
    media: [1, 2, 3, 4].map((i) => ({ id: `med_${i}`, src: `/images/x/${i}.webp`, kind: 'image' })),
  },
  chapters: [
    { id: 'ch_a', type: 'article', heading: 'A',
      heroImage: { mediaId: 'med_1' },
      media: [
        { mediaId: 'med_2', type: 'image' },
        { mediaId: 'med_3', type: 'image', caption: 'three' },
      ] },
    { id: 'ch_p', type: 'panorama', mediaId: 'med_4' },
  ],
})

console.log('\nedit-ops\n')

t('every operation leaves the input document untouched', () => {
  const d = doc()
  const before = JSON.stringify(d)
  setField(d, 'ch_a', 'text', 'hi')
  removeMedia(d, 'ch_a', 0)
  promoteToHero(d, 'ch_a', 0)
  removeChapter(d, 'ch_a')
  addAnnotation(d, 'ch_p', { x: 0.5, label: 'x' })
  assert.equal(JSON.stringify(d), before)
})

t('clearing a field deletes it rather than storing an empty string', () => {
  const d = setField(setField(doc(), 'ch_a', 'text', 'words'), 'ch_a', 'text', '')
  assert.ok(!('text' in d.chapters[0]))
})

t('removing a photo removes exactly that one', () => {
  const d = removeMedia(doc(), 'ch_a', 0)
  assert.deepEqual(d.chapters[0].media.map((m: any) => m.mediaId), ['med_3'])
})

t('emptying the strip deletes the key instead of leaving []', () => {
  let d = removeMedia(doc(), 'ch_a', 0)
  d = removeMedia(d, 'ch_a', 0)
  assert.ok(!('media' in d.chapters[0]))
})

t('promoting a photo to hero returns the OLD hero to the strip', () => {
  const d = promoteToHero(doc(), 'ch_a', 1)
  assert.equal(d.chapters[0].heroImage.mediaId, 'med_3')
  assert.equal(d.chapters[0].heroImage.caption, 'three', 'the caption travels with it')
  // med_1 was hero; it must still be in the document somewhere.
  assert.ok(JSON.stringify(d.chapters[0]).includes('med_1'), 'the old hero was discarded')
})

t('captions set and clear', () => {
  let d = setMediaCaption(doc(), 'ch_a', 0, 'two')
  assert.equal(d.chapters[0].media[0].caption, 'two')
  d = setMediaCaption(d, 'ch_a', 0, '')
  assert.ok(!('caption' in d.chapters[0].media[0]))
})

t('reordering within the strip, and refusing to run off the ends', () => {
  const d = moveMedia(doc(), 'ch_a', 0, 1)
  assert.deepEqual(d.chapters[0].media.map((m: any) => m.mediaId), ['med_3', 'med_2'])
  assert.deepEqual(moveMedia(doc(), 'ch_a', 0, -1).chapters[0].media.map((m: any) => m.mediaId), ['med_2', 'med_3'])
})

t('chapters move, and stop at the ends rather than wrapping', () => {
  assert.deepEqual(moveChapter(doc(), 'ch_p', -1).chapters.map((c: any) => c.id), ['ch_p', 'ch_a'])
  assert.deepEqual(moveChapter(doc(), 'ch_a', -1).chapters.map((c: any) => c.id), ['ch_a', 'ch_p'])
  assert.deepEqual(moveChapter(doc(), 'ch_p', 1).chapters.map((c: any) => c.id), ['ch_a', 'ch_p'])
})

t('removing a chapter removes only that chapter', () => {
  assert.deepEqual(removeChapter(doc(), 'ch_a').chapters.map((c: any) => c.id), ['ch_p'])
})

t('annotations are kept sorted left to right', () => {
  let d = addAnnotation(doc(), 'ch_p', { x: 0.8, label: 'right' })
  d = addAnnotation(d, 'ch_p', { x: 0.2, label: 'left' })
  d = addAnnotation(d, 'ch_p', { x: 0.5, label: 'middle' })
  assert.deepEqual(d.chapters[1].annotations.map((a: any) => a.label), ['left', 'middle', 'right'])
})

t('editing an annotation re-sorts and drops emptied optionals', () => {
  let d = addAnnotation(doc(), 'ch_p', { x: 0.2, label: 'a', note: 'n' })
  d = addAnnotation(d, 'ch_p', { x: 0.6, label: 'b' })
  d = updateAnnotation(d, 'ch_p', 0, { x: 0.9, note: '' })
  assert.deepEqual(d.chapters[1].annotations.map((a: any) => a.label), ['b', 'a'])
  assert.ok(!('note' in d.chapters[1].annotations[1]))
})

t('removing the last annotation deletes the key', () => {
  let d = addAnnotation(doc(), 'ch_p', { x: 0.5, label: 'only' })
  d = removeAnnotation(d, 'ch_p', 0)
  assert.ok(!('annotations' in d.chapters[1]))
})

t('unusedMedia reports what the cull has left over', () => {
  assert.deepEqual(unusedMedia(doc()), [])
  const d = removeMedia(doc(), 'ch_a', 0)
  assert.deepEqual(unusedMedia(d), ['med_2'])
})

t('operations on a missing chapter are a no-op, not a crash', () => {
  const d = doc()
  assert.deepEqual(setField(d, 'nope', 'text', 'x'), d)
  assert.deepEqual(removeMedia(d, 'nope', 0), d)
  assert.deepEqual(removeMedia(d, 'ch_p', 5), d)
})

console.log(`\n${n} passed\n`)
