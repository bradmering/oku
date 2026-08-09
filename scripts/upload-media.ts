/**
 * Upload the media referenced by the trip documents into R2.
 *
 *   npx wrangler login            # once
 *   npm run upload-media          # add --dry-run to see the plan first
 *
 * Reads every `/images/...` path referenced by fixtures, finds the file in the
 * blog repo, and puts it in the `oku-media` bucket under the same key. Keys
 * mirror the document paths exactly, so the documents need no rewriting — see
 * `app/images/[...path]/route.ts`.
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
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BUCKET = 'oku-media'
const SOURCE = process.env.MEDIA_SOURCE
  ?? path.resolve('../../Blog/blog-site/public')
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
function fixtureFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? fixtureFiles(p) : /\.ya?ml$/.test(e.name) ? [p] : []
  })
}

const referenced = new Set<string>()
for (const f of ['fixtures/migrated', 'fixtures/forward'].flatMap(fixtureFiles)) {
  const text = readFileSync(f, 'utf8')
  // Documents reference several prefixes — /images AND /videos (mp4s plus their
  // jpg posters). Matching only /images silently skipped 18 files on the first run.
  for (const m of text.matchAll(/(\/(?:images|videos|audio)\/[^\s"'\]]+)/g)) referenced.add(m[1])
}

const paths = [...referenced].sort()
console.log(`\n${paths.length} media path(s) referenced by the documents`)
console.log(`Source: ${SOURCE}`)
console.log(`Bucket: ${BUCKET}${DRY ? '   [dry run]' : ''}\n`)

if (!existsSync(SOURCE)) {
  console.error(`Source directory not found: ${SOURCE}`)
  console.error(`Set MEDIA_SOURCE to the blog repo's public/ directory.`)
  process.exit(1)
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
  const local = path.join(SOURCE, ref)

  if (!existsSync(local)) { missing.push(ref); continue }

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
  console.log(`\n⚠️  ${missing.length} referenced file(s) not found under ${SOURCE}:`)
  for (const m of missing.slice(0, 15)) console.log(`     ${m}`)
  if (missing.length > 15) console.log(`     … and ${missing.length - 15} more`)
  console.log(`\nThese will 404 until the files are located. Not fatal — the documents`)
  console.log(`are the record; the media just isn't where the blog repo keeps it.`)
}
console.log()
