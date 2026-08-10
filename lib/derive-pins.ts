/**
 * Compute map pins from the media the story actually uses — decisions/0017,
 * closing the expiry that decisions/0013 set on the stored `stage.pins`.
 *
 * A pin is not a thing an author writes. It is a **geographic index over media
 * the story already contains** — "this photograph was taken here" — and both
 * halves of that sentence are facts ingest already knows: `coordinates` comes
 * from EXIF, and whether the story uses the photograph is visible in the
 * chapters. Nobody authors a pin. The data proposes, the author disposes
 * (decisions/0012).
 *
 * Runs at bake time next to `resolve-media.ts`, on the AUTHORED document —
 * before references are collapsed, so `mediaId` is still available. Legacy
 * documents, whose chapters carry literal paths, match by `src` instead.
 */

import type { Trip } from '../schema/trip.ts'

export type DerivedPin = {
  coordinates: [number, number]
  thumbnail: string
  image: string
  caption?: string
}

type MediaItem = NonNullable<Trip['sources']>['media'][number]

/** One place the story points at a media file, with the caption authored there. */
type Usage = { key: string; caption?: string }

function collectUsages(chapters: Trip['chapters']): Usage[] {
  const out: Usage[] = []
  const push = (key: string | undefined, caption?: string) => {
    if (key) out.push({ key, caption })
  }

  for (const ch of chapters as any[]) {
    switch (ch.type) {
      case 'title':
      case 'splash':
      case 'image':
        push(ch.imageId ?? ch.image, ch.caption)
        break
      case 'article':
        if (ch.heroImage) push(ch.heroImage.mediaId ?? ch.heroImage.src, ch.heroImage.caption)
        for (const m of ch.media ?? []) push(m.mediaId ?? m.src, m.caption)
        break
      case 'gallery':
        for (const g of ch.images ?? []) push(g.mediaId ?? g.src, g.caption)
        break
      case 'video':
      case 'parallax-video':
      case 'panorama':
        push(ch.mediaId ?? ch.src, ch.caption)
        break
    }
  }
  return out
}

/**
 * Pins for every image the story uses that carries coordinates, in order of
 * first appearance.
 *
 * Videos are excluded: a pin renders a photograph, and a poster frame standing
 * in for a clip on a map reads as a photograph that isn't one.
 */
export function derivePins(trip: Trip): DerivedPin[] {
  const media = trip.sources?.media ?? []
  if (!media.length) return []

  const byId = new Map<string, MediaItem>()
  const bySrc = new Map<string, MediaItem>()
  for (const m of media) {
    byId.set(m.id, m)
    // First entry wins, so a duplicated path can't silently swap the pin.
    if (!bySrc.has(m.src)) bySrc.set(m.src, m)
  }

  const pins: DerivedPin[] = []
  const seen = new Set<string>()

  for (const { key, caption } of collectUsages(trip.chapters)) {
    const item = byId.get(key) ?? bySrc.get(key)
    if (!item || item.kind !== 'image' || !item.coordinates) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    pins.push({
      coordinates: item.coordinates as [number, number],
      image: item.src,
      // A converter files the small copy under `renditions.thumb`; fall back to
      // the full image rather than dropping the pin.
      thumbnail: item.renditions?.thumb ?? item.src,
      // The caption comes from the REFERENCE, not the media item: sources hold
      // facts, chapters hold voice (decisions/0016). This is also what resolves
      // the drift the stored pins had accumulated — see decisions/0017.
      ...(caption ? { caption } : {}),
    })
  }

  return pins
}
