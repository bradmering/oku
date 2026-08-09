import type { ResolvedTrip } from '@/schema/trip'
import baked from './trips.generated.json'

/**
 * Trips are baked into the bundle at build time by `scripts/build-trips.ts`.
 *
 * Deliberately NOT read from the filesystem here: this module runs at request
 * time in workerd, which has no filesystem. See that script's header for the
 * failure this caused.
 *
 * When stories move to R2 this becomes an async fetch — the call sites are
 * already shaped for it.
 */
const entries = baked as unknown as { source: string; trip: ResolvedTrip }[]

export function getTrip(slug: string): ResolvedTrip | null {
  return entries.find((e) => e.trip.slug === slug)?.trip ?? null
}

export function getAllTrips(): { trip: ResolvedTrip; source: string }[] {
  return entries
}
