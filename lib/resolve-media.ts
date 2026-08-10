/**
 * Collapse indirect media references into concrete paths — see decisions/0016.
 *
 * Chapters may point at media two ways: `src`/`image` (a literal path) or
 * `mediaId`/`imageId` (an entry in `sources.media[]`). This resolves the second
 * into the first, so **the renderer only ever sees literal paths** and no
 * component needs a trip object threaded down to it.
 *
 * Called from `scripts/build-trips.ts` at bake time, and from
 * `scripts/validate-fixtures.ts` so a broken reference fails the build rather
 * than a reader's page. It is a pure function over a parsed document, so a
 * future live editor can call it at runtime unchanged.
 *
 * This is also where the "exactly one of the pair" rule lives. It is NOT in Zod:
 * `MediaRef` is consumed via `.shape`/`.extend()` and a `.refine()` returns a
 * ZodEffects that cannot be spread, and dangling-id detection is
 * cross-referential so Zod could not express it either way.
 */

import type { ResolvedTrip, Trip } from '../schema/trip.ts'

export type ResolveIssue = { path: string; message: string }

type Pointer = { src?: string; mediaId?: string; poster?: string; type?: string }
type ImageHolder = { image?: string; imageId?: string }
type MediaItem = NonNullable<Trip['sources']>['media'][number]

/**
 * @param requireOne  false only for `title`, whose image is genuinely optional —
 *   a `text` or `route` layout shows no photograph at all.
 * @param inferType   fill `type` from the item's `kind` (article media only).
 *   Passed explicitly rather than sniffed with `'type' in ref`: a YAML item that
 *   omits the key has no property to detect, which is exactly the case that
 *   needs filling.
 */
function resolvePointer(
  ref: Pointer,
  media: Map<string, MediaItem>,
  path: string,
  issues: ResolveIssue[],
  requireOne = true,
  inferType = false,
): void {
  if (ref.src != null && ref.mediaId != null) {
    issues.push({ path, message: `has both src ("${ref.src}") and mediaId ("${ref.mediaId}") — exactly one` })
    return
  }
  if (ref.mediaId == null) {
    if (ref.src == null && requireOne) issues.push({ path, message: 'has neither src nor mediaId' })
    return
  }

  const item = media.get(ref.mediaId)
  if (!item) {
    issues.push({ path, message: `mediaId "${ref.mediaId}" is not in sources.media[]` })
    return
  }

  ref.src = item.src
  delete ref.mediaId
  // The reference's own poster wins — it is an authored choice.
  if (ref.poster == null && item.poster != null) ref.poster = item.poster
  // `type` on article media is `kind` on the item. Fill it rather than make the
  // author restate what ingest already knows.
  if (inferType && ref.type == null) {
    if (item.kind === 'audio') {
      issues.push({ path, message: `mediaId "${item.id}" is audio; article media is image or video` })
    } else {
      ref.type = item.kind
    }
  }
}

function resolveImage(
  ch: ImageHolder,
  media: Map<string, MediaItem>,
  path: string,
  issues: ResolveIssue[],
  requireOne = true,
): void {
  const p: Pointer = { src: ch.image, mediaId: ch.imageId }
  resolvePointer(p, media, path, issues, requireOne)
  if (p.src != null) ch.image = p.src
  delete ch.imageId
}

/**
 * Returns a RESOLVED copy; the input is not mutated.
 *
 * The return type is `ResolvedTrip` because that is what this function produces:
 * every `mediaId`/`imageId` is gone and every reference carries a literal path.
 * Saying `Trip` made every caller cast, which hid the one thing the signature
 * should have been telling them.
 */
export function resolveMedia(trip: Trip): { trip: ResolvedTrip; issues: ResolveIssue[] } {
  const out = structuredClone(trip)
  const issues: ResolveIssue[] = []
  const media = new Map((out.sources?.media ?? []).map((m) => [m.id, m]))

  out.chapters.forEach((ch: any, i: number) => {
    const at = `chapters[${i}] (${ch.type}${ch.id ? ` #${ch.id}` : ''})`

    switch (ch.type) {
      case 'title':
        resolveImage(ch, media, `${at}.image`, issues, false)
        break
      case 'splash':
      case 'image':
        resolveImage(ch, media, `${at}.image`, issues)
        break
      case 'article':
        if (ch.heroImage) resolvePointer(ch.heroImage, media, `${at}.heroImage`, issues)
        ch.media?.forEach((m: Pointer, j: number) => {
          resolvePointer(m, media, `${at}.media[${j}]`, issues, true, true)
          if (m.type == null) issues.push({ path: `${at}.media[${j}]`, message: 'has no type and no mediaId to infer it from' })
        })
        break
      case 'gallery':
        ch.images?.forEach((img: Pointer, j: number) => resolvePointer(img, media, `${at}.images[${j}]`, issues))
        break
      case 'video':
      case 'parallax-video':
      case 'panorama':
        resolvePointer(ch, media, at, issues)
        break
    }
  })

  // The cast is the function's whole contract: `out` started as a Trip and the
  // walk above turned it into a ResolvedTrip.
  return { trip: out as unknown as ResolvedTrip, issues }
}
