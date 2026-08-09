/**
 * Upload the media referenced by the trip documents into R2.
 *
 *   npx wrangler login            # once
 *   npm run upload-media          # add --dry-run to see the plan first
 *
 * Reads every media path the BAKED documents reference, finds the file under one
 * of the source roots, and puts it in the `oku-media` bucket under the same key.
 * Keys mirror the document paths exactly, so the documents need no rewriting —
 * see `app/images/[...path]/route.ts`.
 *
 * **Media lives in more than one root.** Ingested stories land in `.media/`
 * (built by `scripts/convert-media.sh`); the migrated blog stories still live in
 * the blog repo. `MEDIA_SOURCE` is therefore a colon-separated LIST, searched in
 * order, first hit wins. A single root silently reported 164 White Rim files as
 * missing.
 *
 * **Paths come from `lib/trips.generated.json`, not from a regex over YAML.**
 * The bake has already resolved every `mediaId`, so it holds exactly the paths
 * the renderer will request — no more, no less. Regexing the YAML also swept up
 * `renditions` entries, which are alternates that need not exist locally, and
 * uploaded phantom files for them.
 *
 * Re-runs are cheap: successfully uploaded files are recorded in
 * `.media-manifest.json` and skipped unless their size changed. Pass --force to
 * re-send everything.
 *
 * Note: there is no `wrangler r2 object list` — the CLI only does get/put/delete
 * — so the manifest is OUR record, not the bucket's. If the two ever disagree,
 * delete the manifest and re-run.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BUCKET = 'oku-media'
/** Colon-separated, searched in order. Ingested media first — it is the
 *  authoritative copy for anything `scripts/ingest-trip.ts` produced. */
const SOURCES = (process.env.MEDIA_SOURCE ?? `.media:${path.resolve('../../Blog/blog-site/public')}`)
  .split(':')
  .filter(Boolean)
const DRY = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

/**
 * What we've already uploaded, tracked locally.
 *
 * There is NO `wrangler r2 object list` — only get/put/delete — so the bucket
 * can't be enumerated from the CLI. A local manifest is the pragmatic
 * alternative: it makes re-runs fast, at the cost of being our record rather
 * than the bucket's truth. `--force` ignores it.
 */
const MANIFEST = '.media-manifest.json'

// ── every media path the documents reference ────────────────────────────────
const BAKED = 'lib/trips.generated.json'
if (!existsSync(BAKED)) {
  console.error(`${BAKED} not found — run \`npm run bake\` first.`)
  process.exit(1)
}

const MEDIA_PATH = /^\/(?:images|videos|audio)\//

/**
 * Walk the baked documents for servable media paths.
 *
 * `renditions` is skipped deliberately: those are named alternates a converter
 * may or may not have produced, and the renderer never requests them. Uploading
 * them meant chasing files that were never supposed to exist.
 */
function collectPaths(node: unknown, into: Set<string>): void {
  if (typeof node === 'string') {
    if (MEDIA_PATH.test(node)) into.add(node)
    return
  }
  if (Array.isArray(node)) {
    for (const v of node) collectPaths(v, into)
    return
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'renditions') continue
      collectPaths(value, into)
    }
  }
}

const baked = JSON.parse(readFileSync(BAKED, 'utf8')) as { source: string; trip: unknown }[]
const referenced = new Set<string>()
for (const { trip } of baked) collectPaths(trip, referenced)

const paths = [...referenced].sort()
console.log(`\n${paths.length} media path(s) referenced by ${baked.length} baked document(s)`)
console.log(`Sources: ${SOURCES.join('  ·  ')}`)
console.log(`Bucket:  ${BUCKET}${DRY ? '   [dry run]' : ''}\n`)

const usable = SOURCES.filter((s) => existsSync(s))
if (!usable.length) {
  console.error(`None of the source roots exist:\n  ${SOURCES.join('\n  ')}`)
  console.error(`Set MEDIA_SOURCE to a colon-separated list of media roots.`)
  process.exit(1)
}
for (const s of SOURCES) if (!existsSync(s)) console.log(`  (skipping missing root ${s})\n`)

/** First root that has the file. */
function locate(ref: string): string | null {
  for (const root of usable) {
    const p = path.join(root, ref)
    if (existsSync(p)) return p
  }
  return null
}

// ── what we've already sent ─────────────────────────────────────────────────
type Sent = Record<string, { size: number; at: string }>
let sent: Sent = {}
if (!FORCE && existsSync(MANIFEST)) {
  try { sent = JSON.parse(readFileSync(MANIFEST, 'utf8')) } catch { sent = {} }
  const n = Object.keys(sent).length
  if (n) console.log(`${n} file(s) previously uploaded (per ${MANIFEST}) — unchanged ones are skipped\n`)
}

// ── upload ──────────────────────────────────────────────────────────────────
let uploaded = 0, skipped = 0, missing: string[] = [], bytes = 0

for (const ref of paths) {
  const key = ref.replace(/^\//, '')                 // /images/a/b.webp → images/a/b.webp
  const local = locate(ref)

  if (!local) { missing.push(ref); continue }

  const size = statSync(local).size
  // Skip only if we sent it AND the file hasn't changed since.
  if (sent[key]?.size === size) { skipped++; continue }
  bytes += size

  if (DRY) {
    console.log(`  would put  ${key}  (${(size / 1024).toFixed(0)} KB)`)
    uploaded++
    continue
  }

  try {
    execFileSync(
      'npx',
      ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', local, '--remote'],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    uploaded++
    sent[key] = { size, at: new Date().toISOString() }
    // Written every time, so an interrupted run still records its progress.
    writeFileSync(MANIFEST, JSON.stringify(sent, null, 0))
    process.stdout.write(`\r  uploaded ${uploaded}/${paths.length - missing.length - skipped}   `)
  } catch (e) {
    console.error(`\n  ✗ ${key}: ${(e as Error).message.split('\n')[0]}`)
  }
}

console.log(`\n\n${uploaded} uploaded · ${skipped} already present · ${(bytes / 1024 / 1024).toFixed(1)} MB`)

if (missing.length) {
  console.log(`\n⚠️  ${missing.length} referenced file(s) not found in any source root:`)
  for (const m of missing.slice(0, 15)) console.log(`     ${m}`)
  if (missing.length > 15) console.log(`     … and ${missing.length - 15} more`)
  console.log(`\nNot fatal — the documents are the record. Expect this for the`)
  console.log(`forward/ fixtures, whose media is illustrative and never existed.`)
  console.log(`For a real story it means a source root is missing from MEDIA_SOURCE.`)
}
console.log()
