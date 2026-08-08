import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { load as yamlLoad } from 'js-yaml'
import { Trip } from '@/schema/trip'

/** Every fixture except `legacy/` — those are pre-spec evidence and don't parse
 *  (decisions/0011). Migrated + forward documents are what the renderer shows. */
const ROOTS = ['fixtures/migrated', 'fixtures/forward']

function collect(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? collect(p) : /\.ya?ml$/.test(e.name) ? [p] : []
  })
}

const files = () => ROOTS.flatMap(collect)

export function getTrip(slug: string): Trip | null {
  for (const f of files()) {
    const raw = yamlLoad(readFileSync(f, 'utf8'))
    const r = Trip.safeParse(raw)
    if (r.success && r.data.slug === slug) return r.data
  }
  return null
}

export function getAllTrips(): { trip: Trip; source: string }[] {
  return files()
    .map((f) => {
      const r = Trip.safeParse(yamlLoad(readFileSync(f, 'utf8')))
      return r.success ? { trip: r.data, source: f } : null
    })
    .filter((x): x is { trip: Trip; source: string } => x !== null)
    .sort((a, b) => a.trip.title.localeCompare(b.trip.title))
}
