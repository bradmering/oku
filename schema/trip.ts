/**
 * The trip document format — the source of truth.
 *
 * `spec/01-data-model.md` explains this file. Where they disagree, this file wins
 * and the prose is a bug.
 *
 * One definition gives us runtime validation and inferred TypeScript types.
 */

import { z } from 'zod'

// ── Primitives ───────────────────────────────────────────────────────────────

/** [longitude, latitude] — lng first, matching GeoJSON and Mapbox. */
export const LngLat = z.tuple([z.number(), z.number()])

export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
export const ISODateTime = z.string().datetime({ offset: true })

export const SpecVersion = z.literal(1)

// ── Keyframe ─────────────────────────────────────────────────────────────────
// A target for the stage, carried by a `move` chapter. NOT a trigger: the stage
// interpolates between consecutive keyframes as the reader scrolls (or as the
// driving media plays). See decisions/0012.

export const Keyframe = z.object({
  coordinates: LngLat.optional(),
  zoom: z.number().optional(),
  /** Camera angle in degrees. NOT `pitch` — see decisions/0007. */
  tilt: z.number().min(0).max(85).optional(),
  bearing: z.number().optional(),
  /** 0..1 along the stage route. A value to interpolate TOWARD, not a state to set. */
  routeProgress: z.number().min(0).max(1).optional(),
  /** Topo stage: image-space bounds, top-left origin. */
  bounds: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]).optional(),
  marker: z.boolean().optional(),
})

/** What drives interpolation between keyframes. One mechanism, two clocks —
 *  the audio-spine format is not a special case. */
export const Clock = z.enum(['scroll', 'time'])

// ── Stage ────────────────────────────────────────────────────────────────────
// Zero or one per trip. Omitting it entirely is valid — see decisions/0003.

/** A photograph placed on the map.
 *
 *  ⚠ This is DERIVED data that we currently store — see decisions/0013. Pins
 *  are a geographic index over media the story already contains, and their
 *  coordinates come from EXIF. Once `sources.media[]` is populated by ingest,
 *  pins should be computed from media-with-coordinates and this field retired. */
export const Pin = z.object({
  coordinates: LngLat,
  thumbnail: z.string(),
  image: z.string(),
  caption: z.string().optional(),
})

export const MapStage = z.object({
  type: z.literal('map'),
  pins: z.array(Pin).optional(),
  style: z.string().optional(),
  initialView: Keyframe,
  route: z.array(LngLat).optional(),
  /** 3D relief. A mode on the map stage, not a separate stage. */
  terrain: z.boolean().optional(),
  clock: Clock.default('scroll'),
})

export const TopoStage = z.object({
  type: z.literal('topo'),
  topoSlug: z.string(),
  clock: Clock.default('scroll'),
})

/** PROPOSED, not built. The test of whether `stage` is a real abstraction. */
export const TimelineStage = z.object({
  type: z.literal('timeline'),
  clock: Clock.default('scroll'),
})

export const Stage = z.discriminatedUnion('type', [MapStage, TopoStage, TimelineStage])

// ── Legs — journey facts ─────────────────────────────────────────────────────
// A leg is a FACT about the trip, derived by ingest from tracks and timestamps.
// It exists whether or not anyone writes about it. The document does NOT have to
// mirror the legs: the data proposes, the author disposes. See decisions/0012.

export const ActivityMode = z.enum([
  'hike', 'paddle', 'ride', 'climb', 'ski', 'portage', 'travel', 'rest',
])

export const LegStats = z.object({
  distanceM: z.number().nonnegative().optional(),
  ascentM: z.number().optional(),
  descentM: z.number().optional(),
  movingTimeS: z.number().nonnegative().optional(),
  highPointM: z.number().optional(),
})

export const Leg = z.object({
  id: z.string(),
  /** "Day 4" · "the portage" — a SUGGESTION for the author, not a heading. */
  label: z.string().optional(),
  startedAt: ISODateTime,
  endedAt: ISODateTime,
  mode: ActivityMode.optional(),
  /** MAY BE ABSENT. A rest day is a real leg with no track. */
  trackId: z.string().optional(),
  stats: LegStats.optional(),
})

// ── Chapters ─────────────────────────────────────────────────────────────────

/** Chapter objects are STRICT: an unknown key is drift or a typo, and silently
 *  ignoring it is how formats rot. */
const chapter = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict()

const chapterBase = {
  id: z.string(),
  align: z.enum(['left', 'right']).optional(),
  /** When this chapter shipped. Distinct values across chapters ARE what makes a
   *  trip a dispatch — posture is derived, never declared. See decisions/0012. */
  publishedAt: ISODateTime.optional(),
}

export const MediaRef = z.object({
  src: z.string(),
  caption: z.string().optional(),
  poster: z.string().optional(),
  loop: z.boolean().optional(),
})

const prose = {
  heading: z.string().optional(),
  subheading: z.string().optional(),
  text: z.string().optional(),
}

/** Advances the stage. Renders nothing — it is a keyframe you drop into the
 *  thread. The stage INTERPOLATES between consecutive moves as the reader
 *  scrolls, so the camera eases and the route line draws smoothly. */
export const MoveChapter = chapter({
  ...chapterBase,
  type: z.literal('move'),
  to: Keyframe,
  /** ms into the driving media. Only meaningful when the stage clock is 'time'. */
  at: z.number().nonnegative().optional(),
  ease: z.enum(['linear', 'ease', 'none']).optional(),
})

export const TitleChapter = chapter({ ...chapterBase, ...prose, type: z.literal('title'), image: z.string().optional() })
export const SplashChapter = chapter({ ...chapterBase, ...prose, type: z.literal('splash'), image: z.string() })
export const MapChapter = chapter({ ...chapterBase, ...prose, type: z.literal('map') })
/** Heading and stats are the base condition; prose is optional. A "Day 4" marker
 *  is this chapter with a heading, stats on, and nothing written. */
export const ArticleChapter = chapter({
  ...chapterBase, ...prose,
  type: z.literal('article'),
  /** Presence ⇒ render this leg's stats. Bound explicitly — ingest pre-fills the
   *  reference, the author can change it. Beats inferring from position. */
  stats: z.object({ legId: z.string() }).optional(),
  heroImage: MediaRef.optional(),
  media: z.array(MediaRef.extend({ type: z.enum(['image', 'video']) })).optional(),
})
export const ImageChapter = chapter({ ...chapterBase, type: z.literal('image'), image: z.string(), caption: z.string().optional() })
export const GalleryChapter = chapter({
  ...chapterBase,
  type: z.literal('gallery'),
  layout: z.enum(['single', 'duo', 'trio', 'quad', 'grid']),
  images: z.array(z.object({ src: z.string(), caption: z.string().optional() })),
})
export const VideoChapter = chapter({ ...chapterBase, type: z.literal('video'), ...MediaRef.shape })
export const ParallaxVideoChapter = chapter({
  ...chapterBase, ...prose, ...MediaRef.shape,
  type: z.literal('parallax-video'),
  layout: z.enum(['full', 'split']).optional(),
})
export const OverviewChapter = chapter({ ...chapterBase, ...prose, type: z.literal('overview') })
export const LogisticsChapter = chapter({
  ...chapterBase, ...prose,
  type: z.literal('logistics'),
  links: z.array(z.object({ label: z.string(), url: z.string(), note: z.string().optional() })).optional(),
  quads: z.array(z.object({ name: z.string(), url: z.string(), year: z.number().optional(), scale: z.string().optional(), note: z.string().optional() })).optional(),
  packing: z.array(z.object({ group: z.string(), items: z.array(z.string()) })).optional(),
})
export const TopoChapter = chapter({
  ...chapterBase, ...prose,
  type: z.literal('topo'),
  topoSlug: z.string(),
  /** A CLIMBING pitch — a rope length. Camera angle is `cue.tilt`. See decisions/0007. */
  pitch: z.number().int().optional(),
  bgOpacity: z.number().optional(),
  foregroundImage: z.string().optional(),
})

export const Chapter = z.discriminatedUnion('type', [
  MoveChapter,
  TitleChapter, SplashChapter, MapChapter, ArticleChapter, ImageChapter,
  GalleryChapter, VideoChapter, ParallaxVideoChapter, OverviewChapter,
  LogisticsChapter, TopoChapter,
])

// ── Sources (ingest output) ──────────────────────────────────────────────────

export const Track = z.object({
  id: z.string(),
  name: z.string().optional(),
  startedAt: ISODateTime.optional(),
  endedAt: ISODateTime.optional(),
  points: z.array(LngLat).optional(),
})

export const MediaItem = z.object({
  id: z.string(),
  src: z.string(),
  kind: z.enum(['image', 'video', 'audio']),
  capturedAt: ISODateTime.optional(),
  coordinates: LngLat.optional(),
  legId: z.string().optional(),
})

export const Sources = z.object({
  tracks: z.array(Track).default([]),
  media: z.array(MediaItem).default([]),
  /** Journey facts derived from tracks + timestamps. Scaffolding, not a constraint. */
  legs: z.array(Leg).default([]),
})

// ── Trip ─────────────────────────────────────────────────────────────────────

export const Author = z.object({
  id: z.string(),
  name: z.string(),
})

export const Visibility = z.enum(['private', 'unlisted', 'public'])

export const Trip = z.object({
  specVersion: SpecVersion,
  id: z.string(),
  slug: z.string(),

  title: z.string(),
  subtitle: z.string().optional(),
  dates: z.object({ start: ISODate, end: ISODate.optional() }),
  tags: z.array(z.string()).optional(),

  /** Plural from day one. Making it plural later is a migration. */
  authors: z.array(Author).min(1),

  /** Omit for a stageless longform story — decisions/0003. */
  /** THE FOUNDATION — tracks, media, and the legs derived from them. */
  sources: Sources.optional(),
  stage: Stage.optional(),
  chapters: z.array(Chapter),

  /** No `posture` field: dispatch vs report is DERIVED from whether chapters
   *  carry distinct `publishedAt` values. Never declared. See decisions/0012.
   *  No `segments`: the thread is flat. */
  /** PHASE 3. Present so it isn't a retrofit; nothing enforces it yet — decisions/0008. */
  visibility: Visibility.default('unlisted'),
})

export type Trip = z.infer<typeof Trip>
export type Chapter = z.infer<typeof Chapter>
export type Leg = z.infer<typeof Leg>
export type Stage = z.infer<typeof Stage>
export type Keyframe = z.infer<typeof Keyframe>
