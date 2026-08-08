/**
 * Validate every fixture against the schema.
 *
 * `fixtures/forward/` IS the specification — those must pass.
 *
 * `fixtures/legacy/` is EVIDENCE, not authority (see decisions/0011). Those four
 * documents predate the spec; failures are reported as drift, never as errors,
 * and the script exits non-zero only if a NON-legacy fixture fails. Do not design
 * the schema backwards from them.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { load as yamlLoad } from 'js-yaml'
import { Trip, Chapter } from '../schema/trip.ts'

const FIXTURES = 'fixtures'
const LEGACY = path.join(FIXTURES, 'legacy')

type Result = { file: string; ok: boolean; issues: string[] }

function collect(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return collect(p)
    return /\.ya?ml$/.test(e.name) ? [p] : []
  })
}

function check(file: string): Result {
  let doc: unknown
  try {
    doc = yamlLoad(readFileSync(file, 'utf8'))
  } catch (e) {
    return { file, ok: false, issues: [`YAML parse error: ${(e as Error).message}`] }
  }
  const r = Trip.safeParse(doc)
  if (r.success) return { file, ok: true, issues: [] }
  const issues = r.error.issues.map((i) => {
    const at = i.path.length ? i.path.join('.') : '(root)'
    return `${at}: ${i.message}`
  })
  return { file, ok: false, issues }
}

/** Collapse `chapters.12.type`, `chapters.13.type` → `chapters[].type` so the
 *  drift report shows distinct problems rather than one problem 400 times. */
function summarize(issues: string[], limit = 12): string[] {
  const counts = new Map<string, number>()
  for (const i of issues) {
    const key = i.replace(/\.\d+\./g, '[].').replace(/\.\d+:/g, '[]:')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, n]) => (n > 1 ? `${k}  ×${n}` : k))
}

/** Validate each chapter independently. Envelope failures stop Zod before it
 *  descends, but chapter-level drift is the part that tells us what to migrate. */
function chapterDrift(file: string): string[] {
  let doc: any
  try {
    doc = yamlLoad(readFileSync(file, 'utf8'))
  } catch {
    return []
  }
  const chapters = doc?.chapters
  if (!Array.isArray(chapters)) return ['(no chapters array — this is a plan, not a story)']

  const issues: string[] = []
  const unknownTypes = new Set<string>()
  for (const ch of chapters) {
    const r = Chapter.safeParse(ch)
    if (r.success) continue
    const known = Chapter.options.some((o: any) => o.shape.type.value === ch?.type)
    if (!known) {
      unknownTypes.add(String(ch?.type))
      continue
    }
    for (const i of r.error.issues) {
      issues.push(`${ch.type}.${i.path.join('.') || '(root)'}: ${i.message}`)
    }
  }
  const out = summarize(issues)
  if (unknownTypes.size) out.unshift(`unknown chapter type(s): ${[...unknownTypes].join(', ')}`)
  return out
}

const legacyFiles = collect(LEGACY)
const currentFiles = collect(FIXTURES).filter((f) => !f.startsWith(LEGACY + path.sep))

let failed = 0

if (currentFiles.length) {
  console.log('\n── Fixtures ────────────────────────────────────────────────\n')
  for (const f of currentFiles) {
    const r = check(f)
    if (r.ok) {
      console.log(`  ✅ ${path.relative(FIXTURES, f)}`)
    } else {
      failed++
      console.log(`  ❌ ${path.relative(FIXTURES, f)}`)
      for (const i of summarize(r.issues)) console.log(`       ${i}`)
    }
  }
} else {
  console.log('\n── Fixtures ────────────────────────────────────────────────\n')
  console.log('  (none yet — only legacy documents are present)')
}

if (legacyFiles.length) {
  console.log('\n── Legacy drift report ─────────────────────────────────────')
  console.log('   Evidence, not authority (decisions/0011). These predate the')
  console.log('   spec and never fail the build. Do not design backwards from')
  console.log('   them — the format must be more robust than they are.\n')
  for (const f of legacyFiles) {
    const r = check(f)
    const name = path.basename(f)
    if (r.ok) {
      console.log(`  ✅ ${name} — already conforms`)
    } else {
      console.log(`  ⚠️  ${name}`)
      console.log(`       envelope:`)
      for (const i of summarize(r.issues)) console.log(`         ${i}`)
      // Envelope errors stop Zod before it reaches the chapters, so validate
      // each chapter on its own — that's where the interesting drift lives.
      const chIssues = chapterDrift(f)
      if (chIssues.length) {
        console.log(`       chapters:`)
        for (const i of chIssues) console.log(`         ${i}`)
      }
      console.log()
    }
  }
}

console.log('────────────────────────────────────────────────────────────')
if (failed) {
  console.log(`\n${failed} non-legacy fixture(s) failed.\n`)
  process.exit(1)
}
console.log('\nAll non-legacy fixtures pass.\n')
