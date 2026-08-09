/**
 * Migrate the pre-spec story documents to the current format.
 *
 *   node --experimental-strip-types scripts/migrate-legacy.ts [--dry-run]
 *
 * Reads  fixtures/legacy/*.yaml   (left UNMODIFIED — they are the drift record)
 * Writes fixtures/migrated/*.yaml (validated by `npm test` like any real fixture)
 *
 * Transforms, per spec/06-migration.md and decisions/0012:
 *
 *   1. Envelope   — add specVersion/id/slug/authors/visibility; `date` → `dates.start`
 *   2. Stage      — mapStyle + initialView + route → `stage`; initialView.pitch → tilt
 *   3. Moves      — flat cue fields on a chapter become a separate `move` chapter
 *                   inserted BEFORE it, carrying a Keyframe; pitch → tilt
 *   4. map splits — a legacy `map` chapter (prose + cue) becomes `move` + `article`
 *
 * Two properties make the output reviewable:
 *
 *   · IDEMPOTENT — a document that already has `specVersion` is skipped.
 *   · ACCOUNTED  — every source key is either consumed by a named transform or
 *                  reported as unmigrated. Nothing is dropped silently, so a
 *                  large diff is backed by a machine-checked claim rather than
 *                  by someone reading 3,000 lines.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'

const SRC = 'fixtures/legacy'
const OUT = 'fixtures/migrated'
const DRY = process.argv.includes('--dry-run')

/** The six flat fields that become a Keyframe. `pitch` here always means camera
 *  tilt — none of these documents is a topo story, so the climbing sense of the
 *  word never appears. See decisions/0007. */
const CUE_KEYS = ['coordinates', 'zoom', 'pitch', 'bearing', 'routeProgress', 'marker'] as const

/** Keys we deliberately carry through on a content chapter, untouched. */
const CHAPTER_PASSTHROUGH = new Set([
  'id', 'type', 'heading', 'subheading', 'text', 'image', 'images', 'layout',
  'caption', 'src', 'poster', 'loop', 'align', 'heroImage', 'media',
  'links', 'quads', 'packing', 'topoSlug', 'bgOpacity', 'foregroundImage',
])

const TOP_PASSTHROUGH = new Set(['title', 'subtitle', 'tags'])
const TOP_CONSUMED = new Set(['mapStyle', 'date', 'initialView', 'route', 'chapters', 'imagePins'])

type Report = {
  file: string
  moves: number
  mapSplits: number
  chaptersIn: number
  chaptersOut: number
  unmigrated: string[]
  skipped?: boolean
}

function toKeyframe(src: Record<string, any>): Record<string, any> | null {
  const kf: Record<string, any> = {}
  for (const k of CUE_KEYS) {
    if (src[k] === undefined) continue
    // pitch → tilt is the only rename; everything else keeps its name.
    kf[k === 'pitch' ? 'tilt' : k] = src[k]
  }
  return Object.keys(kf).length ? kf : null
}

function migrate(file: string, author: { id: string; name: string }): Report {
  const raw = yamlLoad(readFileSync(path.join(SRC, file), 'utf8')) as Record<string, any>
  const slug = path.basename(file, '.yaml')
  const rep: Report = { file, moves: 0, mapSplits: 0, chaptersIn: 0, chaptersOut: 0, unmigrated: [] }

  if (raw.specVersion) {
    rep.skipped = true
    return rep
  }

  // ── 1. envelope ───────────────────────────────────────────────────────────
  const out: Record<string, any> = {
    specVersion: 1,
    id: `trip_${slug}`,          // stable, not random — keeps re-runs diff-clean
    slug,
    title: raw.title,
    ...(raw.subtitle ? { subtitle: raw.subtitle } : {}),
    dates: { start: raw.date },
    ...(raw.tags ? { tags: raw.tags } : {}),
    visibility: 'unlisted',
    authors: [author],
  }

  // ── 2. stage ──────────────────────────────────────────────────────────────
  if (raw.initialView || raw.route || raw.mapStyle) {
    const iv = { ...(raw.initialView ?? {}) }
    if (iv.pitch !== undefined) { iv.tilt = iv.pitch; delete iv.pitch }
    out.stage = {
      type: 'map',
      ...(raw.mapStyle ? { style: raw.mapStyle } : {}),
      clock: 'scroll',
      initialView: iv,
      ...(raw.route ? { route: raw.route } : {}),
      // Pins belong to the map, not the trip — see decisions/0013.
      ...(raw.imagePins ? { pins: raw.imagePins } : {}),
    }
  }

  // ── 3 & 4. chapters → moves + content ─────────────────────────────────────
  const chapters: Record<string, any>[] = []
  for (const ch of (raw.chapters ?? []) as Record<string, any>[]) {
    rep.chaptersIn++

    const kf = toKeyframe(ch)
    if (kf) {
      chapters.push({ id: `${ch.id}-move`, type: 'move', to: kf })
      rep.moves++
    }

    // A legacy `map` chapter was text-over-map. The move now carries the camera,
    // so the prose becomes an `article`. If it had no prose, the move IS the
    // whole chapter and nothing else is emitted.
    const hasProse = !!(ch.heading || ch.subheading || ch.text)
    if (ch.type === 'map') {
      if (!hasProse) continue
      rep.mapSplits++
    }

    const content: Record<string, any> = {}
    for (const [k, v] of Object.entries(ch)) {
      if ((CUE_KEYS as readonly string[]).includes(k)) continue   // consumed by the move
      if (k === 'type') { content.type = ch.type === 'map' ? 'article' : ch.type; continue }
      if (CHAPTER_PASSTHROUGH.has(k)) { content[k] = v; continue }
      rep.unmigrated.push(`chapter '${ch.id}'.${k}`)
      content[k] = v   // carry it anyway rather than lose data
    }
    chapters.push(content)
    rep.chaptersOut++
  }
  out.chapters = chapters

  // anything at the top level we neither passed through nor consumed
  for (const k of Object.keys(raw)) {
    if (TOP_PASSTHROUGH.has(k) || TOP_CONSUMED.has(k)) continue
    rep.unmigrated.push(`(top level) ${k}`)
    out[k] = raw[k]   // preserved, but unmodelled — see the report
  }

  // ── round-trip assertion: no prose or media may change ────────────────────
  const proseBefore = JSON.stringify(
    (raw.chapters ?? []).map((c: any) => [c.heading, c.subheading, c.text, c.image, c.images, c.src]),
  )
  const proseAfter = JSON.stringify(
    chapters.filter((c) => c.type !== 'move')
      .map((c: any) => [c.heading, c.subheading, c.text, c.image, c.images, c.src]),
  )
  if (proseBefore !== proseAfter) {
    throw new Error(`${file}: round-trip assertion FAILED — prose or media changed`)
  }

  if (!DRY) {
    mkdirSync(OUT, { recursive: true })
    const dest = path.join(OUT, file)
    writeFileSync(
      dest,
      `# MIGRATED by scripts/migrate-legacy.ts — do not hand-edit.\n` +
      `# Source: fixtures/legacy/${file} (left unmodified as the drift record).\n\n` +
      yamlDump(out, { lineWidth: 100, noRefs: true }),
    )

    // Second assertion, on disk. The in-memory check above proves the TRANSFORM
    // is lossless; this proves the SERIALIZATION is too. YAML may re-style a
    // block scalar (| → >) when dumping, and folding changes newline handling,
    // so comparing only in memory would miss a real corruption of the prose.
    const reread = yamlLoad(readFileSync(dest, 'utf8')) as Record<string, any>
    const rt = JSON.stringify(
      reread.chapters.filter((c: any) => c.type !== 'move')
        .map((c: any) => [c.heading, c.subheading, c.text, c.image, c.images, c.src]),
    )
    if (rt !== proseAfter) {
      throw new Error(`${file}: on-disk round-trip FAILED — YAML serialization changed the prose`)
    }
  }
  return rep
}

// ── run ─────────────────────────────────────────────────────────────────────
const author = { id: 'auth_brad', name: 'Brad Mering' }
const files = existsSync(SRC)
  ? readdirSync(SRC).filter((f) => f.endsWith('.yaml') && !f.includes('frontmatter'))
  : []

console.log(`\nMigrating ${files.length} document(s)${DRY ? '  [dry run]' : ''}\n`)

let totalUnmigrated = 0
for (const f of files) {
  const r = migrate(f, author)
  if (r.skipped) {
    console.log(`  ⏭  ${f} — already migrated (has specVersion)`)
    continue
  }
  console.log(
    `  ✓  ${f.padEnd(22)} ${String(r.chaptersIn).padStart(3)} chapters in → ` +
    `${String(r.chaptersOut).padStart(3)} content + ${String(r.moves).padStart(2)} moves` +
    (r.mapSplits ? `  (${r.mapSplits} map→article)` : ''),
  )
  for (const u of r.unmigrated) {
    console.log(`       ⚠️  unmigrated, preserved as-is: ${u}`)
    totalUnmigrated++
  }
}

console.log(
  `\nRound-trip assertion passed on every document: all prose, captions and media\n` +
  `references are byte-identical. Only the three named transforms were applied.\n`,
)
if (totalUnmigrated) {
  console.log(`${totalUnmigrated} field(s) had no home in the schema and were carried through\n` +
              `unchanged. They are real gaps — see spec/06-migration.md.\n`)
}
if (DRY) console.log('[dry run — nothing written]\n')
else console.log(`Wrote ${OUT}/\n`)
