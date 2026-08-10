/**
 * The prose round trip — the tripwire under inline editing (decisions/0022).
 *
 * The editor edits prose ON the rendered page and serialises it by reading the
 * rendered paragraphs back out. That is only lossless while rendering is a
 * SPLIT rather than a TRANSFORM. These assertions fail the moment someone adds a
 * markdown processor to `Article`, which is exactly when inline prose editing
 * stops being safe — better a red test than silently eaten formatting.
 */
import assert from 'node:assert/strict'
import { fromParagraphs, toParagraphs } from '../lib/prose.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log(`  ✓ ${name}`) }

const roundTrip = (s: string) => fromParagraphs(toParagraphs(s))

console.log('\nprose\n')

t('a single paragraph survives', () => {
  assert.equal(roundTrip('One line.'), 'One line.')
})

t('paragraphs survive', () => {
  const s = 'First.\n\nSecond.\n\nThird.'
  assert.equal(roundTrip(s), s)
  assert.equal(toParagraphs(s).length, 3)
})

t('single newlines stay INSIDE a paragraph', () => {
  const s = 'A line.\nStill the same paragraph.'
  assert.equal(toParagraphs(s).length, 1)
  assert.equal(roundTrip(s), s)
})

t('markdown syntax passes through as literal text', () => {
  // The renderer does not process it, so editing what you see is lossless.
  // When that changes, this is where it will be noticed.
  const s = 'Some **bold** and a [link](http://x).\n\n> a quote'
  assert.equal(roundTrip(s), s)
})

t('empty and whitespace-only prose survive', () => {
  assert.equal(roundTrip(''), '')
  assert.equal(roundTrip('   '), '   ')
})

t('runs of more than two newlines COLLAPSE — a known, bounded lossiness', () => {
  // Three blank lines render as two paragraphs, so reading them back gives one
  // blank line between. Stated here so it is a decision rather than a surprise.
  assert.equal(roundTrip('A.\n\n\n\nB.'), 'A.\n\nB.')
})

t('trailing and leading blank lines collapse the same way', () => {
  assert.equal(toParagraphs('\n\nA.').length, 2)
  assert.equal(roundTrip('A.\n\n'), 'A.\n\n')
})

console.log(`\n${n} passed\n`)
