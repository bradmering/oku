/**
 * Bake every valid fixture into a JSON module at build time.
 *
 * The renderer previously read `fixtures/` with node:fs on each request. That
 * works in `next dev` (Node) and fails silently in production (workerd has no
 * filesystem) — the index came up empty and every story 404'd, because Next
 * re-renders on demand and the read returned nothing.
 *
 * Reading the filesystem is a BUILD-time capability. Anything the renderer
 * needs at request time has to be in the bundle or in R2/KV.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { load as yamlLoad } from 'js-yaml'
import { Trip } from '../schema/trip.ts'

const ROOTS = ['fixtures/migrated', 'fixtures/forward']
const OUT = 'lib/trips.generated.json'

function collect(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? collect(p) : /\.ya?ml$/.test(e.name) ? [p] : []
  })
}

const trips = ROOTS.flatMap(collect)
  .map((file) => {
    const r = Trip.safeParse(yamlLoad(readFileSync(file, 'utf8')))
    if (!r.success) {
      console.warn(`  ⚠️  skipped ${file} — does not validate`)
      return null
    }
    return { source: file, trip: r.data }
  })
  .filter((x): x is { source: string; trip: unknown } => x !== null)
  .sort((a, b) => (a.trip as { title: string }).title.localeCompare((b.trip as { title: string }).title))

writeFileSync(OUT, JSON.stringify(trips, null, 0))
const kb = (readFileSync(OUT).length / 1024).toFixed(0)
console.log(`\nBaked ${trips.length} trip(s) → ${OUT} (${kb} KB)`)
for (const { trip, source } of trips) {
  const t = trip as { slug: string }
  console.log(`  · ${t.slug.padEnd(16)} ${source}`)
}
console.log()
