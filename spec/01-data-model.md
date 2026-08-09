# 01 — Data Model

> **Status: draft, revised 2026-08-08** after review. That review deleted four invented concepts —
> see `decisions/0012`.
>
> **The schema in `schema/` is the source of truth.** This document explains it. Where they
> disagree, the schema wins.

---

## The shape, in one picture

```
Trip                      ← the atom
├── sources?              ← THE FOUNDATION: tracks, media, and the legs derived from them
├── stage?                ← optional persistent backdrop (map | topo | none)
└── chapters[]            ← the thread. Flat, ordered. This is the story.
      └── type: 'move'    ← a keyframe. Advances the stage.
```

Three ideas carry the weight:

- **Thread + stage.** The thread is the ordered scroll and is always present. The stage is an
  *optional* persistent surface. `null` is valid — a prose story with no map is first-class.
- **The thread is flat.** No grouping object. You stack content — text, gallery, video — and drop
  in a `move` when the stage should advance. A "Day 4" heading is just a chapter.
- **The stage interpolates between moves.** A `move` is a **keyframe**, not a trigger. Scroll
  position between two moves drives the camera and the route line continuously.

---

## Sources — the foundation

**This is the base layer, not an accessory.** Tracks and timestamped media aligned on one timeline
is the thing that makes a story arrive half-built.

```ts
interface Sources {
  tracks: Track[]      // parsed GPX/FIT/KML, normalized, timestamped
  media: MediaItem[]   // photo/video/audio with capture time and optional geo
  legs: Leg[]          // journey facts derived from the above
}

interface Leg {
  id: string
  label?: string          // "Day 4" · "the portage" — a suggestion, not a heading
  startedAt: ISODateTime
  endedAt: ISODateTime
  mode?: ActivityMode     // hike | paddle | ride | climb | ski | portage | travel | rest
  trackId?: string        // MAY BE ABSENT — a rest day is a real leg with no track
  stats?: LegStats
}
```

**A leg is a fact about the trip**, derived from the data: a time window, a track slice, an
activity mode, stats. It exists whether or not anyone writes about it.

**The document does not have to mirror the legs.** They scaffold the story — they propose where the
days break, where the moves should go, which photos belong together — and the author is free to
ignore all of it. *The data proposes; the author disposes.* One narrative chapter may span three
legs; a leg may get no chapter at all.

Two constraints on how this gets built, both from the hosting work:

- **Extraction runs client-side.** EXIF and GPX parsing in the browser; originals upload direct to
  object storage, only the derived manifest reaches the API. Workers have 128MB isolates and no
  native binaries — no `sharp`, no `exiftool` server-side.
- **The camera-clock timezone cannot be guessed.** Photos record local time with no offset. It has
  to be an input.

---

## Trip

```ts
interface Trip {
  specVersion: 1
  id: string
  slug: string

  title: string
  subtitle?: string
  dates: { start: ISODate; end?: ISODate }   // end absent = still underway
  tags?: string[]

  authors: Author[]          // plural from day one
  sources?: Sources
  stage?: Stage
  chapters: Chapter[]

  visibility: Visibility     // PHASE 3 — nothing enforces it yet
}
```

**No `posture` field.** Whether something is a dispatch or a report is **derived, never declared** —
see below. **No `segments`.** The thread is flat.

**On `authors`:** plural from the start. Multi-person composition is the one thing incumbents
can't retrofit, and making it plural later is a migration.

---

## Stage

Zero or one per trip. A persistent surface that outlives any single chapter.

```ts
type Stage =
  | { type: 'map';   style?: string; initialView: Keyframe; route?: LngLat[]; terrain?: boolean; clock?: Clock }
  | { type: 'topo';  topoSlug: string; clock?: Clock }
  | { type: 'timeline'; clock?: Clock }   // PROPOSED — the abstraction's own test

type Clock = 'scroll' | 'time'   // default 'scroll'
```

**`stage` may be omitted entirely** — the stageless longform case, which is a named format and not
a concession.

**`terrain`** turns on 3D relief. A mode on the map stage, not a separate stage. It is also the
automated form of a hand-drawn route overlay.

**`clock`** decides what drives interpolation: scroll position, or playback time in the driving
media (audio spine, pre-rendered flyover). Everything below works the same either way — which is
the point.

---

## Move — the keyframe

```ts
interface MoveChapter {
  id: string
  type: 'move'
  to: Keyframe
  at?: number       // ms into the driving media. Only meaningful when clock === 'time'
  ease?: 'linear' | 'ease' | 'none'
}

interface Keyframe {
  coordinates?: LngLat
  zoom?: number
  tilt?: number          // camera angle in degrees. NOT `pitch` — decisions/0007
  bearing?: number
  routeProgress?: number // 0..1 along the stage route
  bounds?: [[number, number], [number, number]]   // topo stage, image space
  marker?: boolean
}
```

**A move is a block you drop into the thread**, like any other. It renders nothing. It says *the
stage should be here by now.*

### Interpolation is the point

**A move is a keyframe, not a trigger.** Between two consecutive moves, the reader's scroll
progress drives the stage continuously — the camera eases and **the route line draws smoothly**
rather than snapping when some chapter happens to enter the viewport.

This is a spec requirement, not a rendering detail. The current behaviour — cue attached to a
chapter further down the page, map jumping abruptly, the line drawing getting lost — is the problem
this model exists to fix.

**`routeProgress` is a value to interpolate toward**, not a state to set.

**One mechanism, two clocks.** Under `clock: 'scroll'` the progress between keyframes comes from
scroll position. Under `clock: 'time'` it comes from playback position, using `at`. The audio-spine
format is not a special case — it is the same machinery with a different clock, which is why the
temporal variant was worth designing early (`decisions/0005`).

**No `persist` flag.** The stage simply holds the last keyframe until the next move. An inline
full-bleed map is a different thing — a `map` chapter, which renders a map *in the thread* rather
than commanding the backdrop.

---

## Chapter — the thread

```ts
interface ChapterBase {
  id: string
  type: string
  align?: 'left' | 'right'
  publishedAt?: ISODateTime   // when this chapter shipped. See "posture is derived"
}
```

No `cue`. No `persist`. No `segmentId`. Chapters are content; `move` chapters advance the stage.

### Text chapters: heading and stats are the base, prose is optional

```ts
interface ArticleChapter extends ChapterBase {
  type: 'article'
  heading?: string
  subheading?: string
  stats?: { legId: string }   // presence ⇒ render this leg's stats
  text?: string               // optional
  heroImage?: MediaRef
  media?: MediaRef[]
}
```

**A "Day 4" marker is a text chapter with a heading, stats on, and nothing written.** That's
deliberate: one block that degrades gracefully rather than a separate `day` type. Fewer things to
learn.

**`stats` binds to a leg explicitly.** Ingest pre-fills the reference; the author can change it.
Explicit beats the renderer inferring which leg a chapter "belongs to" from its position —
positional magic is invisible until it's wrong.

Full catalogue in `02-chapter-types.md`.

---

## Media identity — chapters point at `sources.media[]`

Every media reference has a direct form and an indirect one, and **exactly one must be present**:

| Direct | Indirect | Where |
|---|---|---|
| `src` | `mediaId` | article hero + media, video, parallax-video, gallery images |
| `image` | `imageId` | title, splash, image |

**Hand-written documents use the direct form; ingested documents use the indirect one.** Both are
correct. A story with no `sources` at all stays writable by hand — the same instinct as GPX-first,
not GPX-required (`decisions/0003`).

The indirect form exists because **a background converter finishes after the document is written.**
With bare paths, every chapter mentioning a file has to be rewritten when its WebP or HLS rendition
lands. With ids, the converter updates one `sources.media[]` entry and every reference follows.

**`build-trips.ts` collapses indirect → direct at bake time**, so the renderer only ever sees
literal paths and no component needs a trip object threaded down to it. The resolver
(`lib/resolve-media.ts`) is also where "exactly one" and dangling-id detection are enforced —
neither is expressible in Zod. See `decisions/0016`.

On a media item, **`src` is always the path to serve**; `renditions` holds named alternates
(`original`, `thumb`, `hls`), and those names are converter-defined, not spec-defined.

---

## Posture is derived, never declared

**The author never picks a format.** No dispatch-or-report dropdown, no mode selector. One editor,
one document; you write, you publish, you write more.

- **A dispatch** is a trip whose chapters have distinct `publishedAt` values — it went out
  incrementally.
- **A report** is the absence of that. Not a posture; just a trip that shipped all at once.
- **Chapters sharing a `publishedAt` are one dispatch entry.** No grouping object needed.

Storing a `posture` field would be redundant with `publishedAt` at best and able to contradict it at
worst. It also breaks on the normal cases: a dispatch edited into a report at home, a trip where
segments 1–5 shipped live and 6 was written after, and Guides, which are evergreen and neither.

**The general principle:** report, dispatch, and guide are things the system infers and renders —
never things a person selects. That's the same instinct as quality-through-constraint: fewer knobs,
not more.

---

## Open questions

- **The plan side.** `hulahula-plan` is a fourth schema — planned stops with cues, dates, and route
  slices. Is a plan a Trip whose legs are `planned` rather than recorded, or its own object? See
  `04-formats.md`.
- **Per-chapter authorship.** Multi-person composition is the differentiator and `authors` lives
  only on Trip. A POV switch needs `authorId` on the chapter.
- **A move with no stage** — undefined. Ignored, or invalid?
- **`text` flavour** — markdown, but which. Legacy renders remark + gfm.
- **`specVersion` rules** — nothing says what forces a bump.
- **`imagePins`** — a real Brooks Range feature, unmodelled.
- **Is `article` the right name** now that heading + stats is the base condition and prose is
  optional? Brad calls it a text chapter.
