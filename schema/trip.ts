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

// ── Cue ──────────────────────────────────────────────────────────────────────
// The instruction a chapter sends to the stage. Presence of a cue is what makes
// a chapter stage-driving. See decisions/0005 for why `time` exists before
// anything uses it.

export const PositionCue = z.object({
  kind: z.literal('position'),
  coordinates: LngLat.optional(),
  zoom: z.number().optional(),
  /** Camera angle in degrees. NOT `pitch` — see decisions/0007. */
  tilt: z.number().min(0).max(85).optional(),
  bearing: z.number().optional(),
  /** 0..1 along the stage route. */
  routeProgress: z.number().min(0).max(1).optional(),
  /** Topo stage: image-space bounds, top-left origin. */
  bounds: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]).optional(),
  marker: z.boolean().optional(),
})

export const TimeCue = z.object({
  kind: z.literal('time'),
  /** Offset into the driving media — audio spine, pre-rendered flyover. */
  offsetMs: z.number().nonnegative(),
})

export const Cue = z.discriminatedUnion('kind', [PositionCue, TimeCue])

// ── Stage ────────────────────────────────────────────────────────────────────
// Zero or one per trip. Omitting it entirely is valid — see decisions/0003.

export const MapView = z.object({
  coordinates: LngLat,
  zoom: z.number(),
  tilt: z.number().min(0).max(85).optional(),
  bearing: z.number().optional(),
})

export const MapStage = z.object({
  type: z.literal('map'),
  style: z.string().optional(),
  initialView: MapView,
  route: z.array(LngLat).optional(),
  /** 3D relief. A mode on the map stage, not a separate stage. */
  terrain: z.boolean().optional(),
})

export const TopoStage = z.object({
  type: z.literal('topo'),
  topoSlug: z.string(),
})

/** PROPOSED, not built. The test of whether `stage` is a real abstraction. */
export const TimelineStage = z.object({
  type: z.literal('timeline'),
})

export const Stage = z.discriminatedUnion('type', [MapStage, TopoStage, TimelineStage])

// ── Segment ──────────────────────────────────────────────────────────────────
// An optional grouping over consecutive chapters. NOT a day — see decisions/0006.

export const ActivityMode = z.enum([
  'hike', 'paddle', 'ride', 'climb', 'ski', 'portage', 'travel', 'rest',
])

export const LabelScheme = z.enum(['day', 'pitch', 'phase', 'leg', 'place', 'custom'])

export const SegmentStats = z.object({
  distanceM: z.number().nonnegative().optional(),
  ascentM: z.number().optional(),
  descentM: z.number().optional(),
  movingTimeS: z.number().nonnegative().optional(),
  highPointM: z.number().optional(),
})

export const PlannedSegment = z.object({
  label: z.string().optional(),
  date: ISODate.optional(),
  coordinates: LngLat.optional(),
  routePoints: z.array(LngLat).optional(),
  description: z.string().optional(),
  stats: SegmentStats.optional(),
})

export const Segment = z.object({
  id: z.string(),
  /** "Day 4" · "Pitch 12" · "Approach" · "Slovenia" */
  label: z.string(),
  labelScheme: LabelScheme.optional(),
  index: z.number().int().optional(),
  mode: ActivityMode.optional(),
  /** MAY BE ABSENT. A rest day is a real segment with no track. */
  trackId: z.string().optional(),
  stats: SegmentStats.optional(),
  /** The plan side. A plan and a report are the same object — see 04-formats.md. */
  planned: PlannedSegment.optional(),
  /** Dispatch only: when this segment shipped. */
  publishedAt: ISODateTime.optional(),
})

// ── Chapters ─────────────────────────────────────────────────────────────────

/** Chapter objects are STRICT: an unknown key is drift or a typo, and silently
 *  ignoring it is how formats rot. */
const chapter = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict()

const chapterBase = {
  id: z.string(),
  segmentId: z.string().optional(),
  cue: Cue.optional(),
  /** Does the cue outlive this chapter? Defaults true for stage-driving chapters.
   *  `persist: false` is how a full-bleed map lives inside the thread — see decisions/0004. */
  persist: z.boolean().optional(),
  align: z.enum(['left', 'right']).optional(),
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

export const TitleChapter = chapter({ ...chapterBase, ...prose, type: z.literal('title'), image: z.string().optional() })
export const SplashChapter = chapter({ ...chapterBase, ...prose, type: z.literal('splash'), image: z.string() })
export const MapChapter = chapter({ ...chapterBase, ...prose, type: z.literal('map') })
export const ArticleChapter = chapter({
  ...chapterBase, ...prose,
  type: z.literal('article'),
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
  segmentId: z.string().optional(),
})

export const Sources = z.object({
  tracks: z.array(Track).default([]),
  media: z.array(MediaItem).default([]),
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
  stage: Stage.optional(),
  sources: Sources.optional(),
  segments: z.array(Segment).optional(),
  chapters: z.array(Chapter),

  posture: z.enum(['dispatch', 'report']).default('report'),
  /** PHASE 3. Present so it isn't a retrofit; nothing enforces it yet — decisions/0008. */
  visibility: Visibility.default('unlisted'),
})

export type Trip = z.infer<typeof Trip>
export type Chapter = z.infer<typeof Chapter>
export type Segment = z.infer<typeof Segment>
export type Stage = z.infer<typeof Stage>
export type Cue = z.infer<typeof Cue>
