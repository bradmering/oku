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
 * Idempotent by default: an object already in the bucket is skipped, so a
 * failed run can simply be re-run. Pass --force to overwrite.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const BUCKET = 'oku-media'
const SOURCE = process.env.MEDIA_SOURCE
  ?? path.resolve('../../Blog/blog-site/public')
const DRY = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

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
  for (const m of text.matchAll(/(\/images\/[^\s"'\]]+)/g)) referenced.add(m[1])
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

// ── what's already there ────────────────────────────────────────────────────
let existing = new Set<string>()
if (!FORCE && !DRY) {
  try {
    const out = execFileSync(
      'npx',
      ['wrangler', 'r2', 'object', 'list', BUCKET, '--prefix', 'images/'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    for (const m of out.matchAll(/"key"\s*:\s*"([^"]+)"/g)) existing.add(m[1])
    console.log(`${existing.size} object(s) already in the bucket — those are skipped\n`)
  } catch {
    console.log('(could not list the bucket; nothing will be skipped)\n')
  }
}

// ── upload ──────────────────────────────────────────────────────────────────
let uploaded = 0, skipped = 0, missing: string[] = [], bytes = 0

for (const ref of paths) {
  const key = ref.replace(/^\//, '')                 // /images/a/b.webp → images/a/b.webp
  const local = path.join(SOURCE, ref)

  if (!existsSync(local)) { missing.push(ref); continue }
  if (existing.has(key)) { skipped++; continue }

  const size = statSync(local).size
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
