# 01 — Data Model

> **Status: draft.** Derived from four existing schemas and two working renderers, not designed
> fresh. See `00-overview.md` for where it came from.
>
> **The schema in `schema/` is the source of truth.** This document explains it. Where they
> disagree, the schema wins.

---

## The shape, in one picture

```
Trip                      ← the atom
├── stage?                ← optional persistent backdrop (map | topo | none)
├── sources?              ← ingest output: tracks + media pool on one timeline
├── segments[]?           ← optional grouping over consecutive chapters
└── chapters[]            ← the thread. This is the story.
      └── cue?            ← presence makes a chapter stage-driving
```

Two ideas carry most of the weight:

- **Thread + stage.** The thread is the ordered scroll and is always present. The stage is an
  *optional* persistent surface that the thread drives. `null` is a valid stage — a prose story
  with no map is first-class, not degraded.
- **Chapters are stage-driving or flow.** A chapter carrying a `cue` commands the backdrop. A
  chapter without one is self-contained and scrolls past. That distinction is the thing the
  original schema never named, which is why geo fields ended up sprinkled onto prose blocks.

---

## Trip

The atomic unit. Multi-day, multi-sport, multi-person.

```ts
interface Trip {
  id: string
  slug: string

  title: string
  subtitle?: string
  dates: { start: ISODate; end?: ISODate }   // end absent = still underway
  tags?: string[]

  authors: Author[]          // multi-person. authors[0] is the owner.
  stage?: Stage              // omit for a stageless longform story
  sources?: Sources          // ingest output; absent for hand-authored stories
  segments?: Segment[]
  chapters: Chapter[]

  posture: 'dispatch' | 'report'   // see 04-formats.md
  visibility: Visibility           // PHASE 3 — see note below
}
```

**On `visibility`:** the field exists in the model so it isn't a retrofit, but the audience and
privacy layer is **deliberately sequenced late**. Until then, treat every trip as unlisted with an
unguessable slug. Do not build auth. `decisions/0008`.

**On `authors`:** plural from day one. Multi-person composition is the one thing incumbents
structurally can't retrofit, and making it plural later is a migration.

---

## Stage

Zero or one per trip. A persistent surface that outlives any single chapter.

```ts
type Stage =
  | { type: 'map';   style?: string; initialView: MapView; route?: LngLat[]; terrain?: boolean }
  | { type: 'topo';  topoSlug: string }
  | { type: 'timeline' }        // PROPOSED — not built. See below.
```

**`stage` may be omitted entirely.** That's the Luc case: ~5,000 words, 40–50 photos, no map at
all, and excellent. Supporting it is not a concession — it's a named format.

**`terrain`** turns on 3D relief on the map stage. Top-down 2D reads fine for river miles and
coastal plain and is useless for a mountain crossing. It is probably a *mode* on the map stage
rather than a separate stage, and it is the automated form of a hand-drawn route overlay.

**The timeline stage is the abstraction's own test.** If a timeline stage can be implemented
without touching the chapter model, `stage` is a real abstraction. If it can't, "stage" is a
euphemism for "the map" and this section needs rewriting.

---

## Cue — the instruction a chapter sends to the stage

```ts
type Cue =
  | ({ kind: 'position' } & PositionCue)
  | ({ kind: 'time' }     & TimeCue)

interface PositionCue {
  coordinates?: LngLat
  zoom?: number
  tilt?: number          // camera angle in degrees. NOT `pitch` — see decisions/0007
  bearing?: number
  routeProgress?: number // 0..1 along the stage route
  bounds?: [[number, number], [number, number]]  // topo stage, image space
  marker?: boolean
}

interface TimeCue {
  offsetMs: number       // offset into the driving media (audio spine, pre-rendered flyover)
}
```

**Why `time` exists before anything uses it.** Today scroll position is the only clock. Two
independent features want a temporal cue — an audio spine where a narration track drives the
visuals, and a pre-rendered flyover scrubbed by scroll. When two unrelated features want the same
abstraction, it's real. And retrofitting a cue kind touches *every* chapter, which makes it
expensive later and nearly free now. `decisions/0005`.

**⚠ `tilt`, never `pitch`.** In climbing, a pitch is a rope length; a topo chapter's `pitch: 3`
means the third pitch. Camera tilt must not share that name — both already coexist in the legacy
renderers and any generic code reading `chapter.pitch` for camera angle will tilt to 3°.

---

## Segment — the generic grouping

An optional grouping over consecutive chapters. **Not a day.** A day is one labelling scheme
among several.

```ts
interface Segment {
  id: string
  label: string                 // "Day 4" · "Pitch 12" · "Approach" · "Slovenia"
  labelScheme?: 'day' | 'pitch' | 'phase' | 'leg' | 'place' | 'custom'
  index?: number

  mode?: ActivityMode           // hike | paddle | ride | climb | ski | portage | rest | travel
  track?: TrackRef              // MAY BE ABSENT — a rest day is a real segment with no track
  stats?: SegmentStats

  planned?: PlannedSegment      // the plan side — see 04-formats.md
  publishedAt?: ISODateTime     // dispatch only: when this segment shipped
}
```

Four properties matter and all four came from real documents:

1. **Segments are sub-day.** The Brooks Range raw data already splits days —
   `Day_6a…`/`Day_6b…`, `Day_7_To_the_Sea`/`Day_7_Portage…`. The filenames were doing what the
   schema couldn't.
2. **The boundary is an activity-mode change, not a clock time.** A morning climb, a day of
   paddling, an evening portage. That's the multi-sport case, and it's *detectable from
   multi-source tracks* — an ingestion feature, not an authoring chore.
3. **A segment may have no track.** Brooks Range `day5` is a rest day inferred from a gap.
4. **Label schemes vary within one author's work.** Steph Abegg uses pitch on one report and
   terrain phase on another. The label is format-defined, never built in.

**A dispatch entry is exactly one segment, published on its own.** That's what makes the
dispatch/report relationship mechanical rather than a template choice.

---

## Chapter — the thread

```ts
interface ChapterBase {
  id: string
  type: string
  segmentId?: string

  cue?: Cue          // presence ⇒ stage-driving
  persist?: boolean  // does the cue outlive this chapter? default true for stage-driving
  align?: 'left' | 'right'
  publishedAt?: ISODateTime
}
```

**`persist` is why there's no separate "stage block" concept.** A full-bleed map inside the thread
is a map chapter with `persist: false`. Steph Abegg's Mt. Stuart report settles this: it uses a
topo *as a chapter* (one route-overlay image) and *as a spine* (23 pitch sections) in the same
document. Persistence is a property, not a category. `decisions/0004`.

Chapter types are enumerated in `02-chapter-types.md`. Eleven exist today; roughly thirty are
proposed. A third of the proposals are properties or modes rather than types — that document keeps
them separate so the schema doesn't inflate.

---

## Sources — the ingest layer's output

```ts
interface Sources {
  tracks: Track[]      // parsed GPX/FIT/KML, normalized, timestamped
  media: MediaItem[]   // photo/video/audio with capture time and optional geo
  timeline: Timeline   // the alignment: media ↔ track position ↔ segment
}
```

**The timeline is the point.** Aligning tracks and timestamped media on one axis is what lets a
story arrive half-built. It is also what makes a *time-driven* consumption mode possible later —
one timeline, two consumption modes: scroll-driven and time-driven.

**`sources` is optional.** Hand-authored stories have none, and that's fine.

Two constraints that shape the implementation, both from the hosting work:

- **Extraction runs client-side.** EXIF and GPX parsing happen in the browser; originals upload
  direct to object storage and only the derived manifest hits the API. Cloudflare Workers have
  128MB isolates and no native binaries, so there is no `sharp` and no `exiftool` server-side.
- **The camera-clock timezone cannot be guessed.** Photos record local time with no offset. It has
  to be an input.

---

## ⏸ UNDER REVIEW — `segment` and `posture` (paused 2026-08-07, resume here)

Both are **invented, not derived** — no legacy document contains either — and both look confused on
inspection. **Do not build on them until this is settled.**

### `segment` conflates two things

**(A) a chunk of the journey** — a fact about the trip: time window, track slice, activity mode,
stats. Exists whether or not anyone writes about it; derivable by ingest.
**(B) a chunk of the narrative** — an authored section of the document.

They usually align, which is why it wasn't obvious. They come apart when: the rest day is a journey
chunk with no narrative; "the middle days blurred together" is one narrative section over three
journey chunks; Abegg's "Time Stats" is a narrative section that is not a journey chunk.

**The product lives in that gap** — derived journey chunks *propose* authored sections. That is the
"story arrives half-built" claim stated precisely, and the current single object cannot express it.

**Proposal (undecided):** split into **Leg** (a fact, under `sources`, from ingest) and **Segment**
(an authored narrative section that references zero or more legs). And make segments **contiguous
ranges over the flat thread** rather than containers — like a book's parts over its pages — so
`chapters[]` stays the single ordering authority, un-sectioned chapters (title, overview,
logistics) remain legal, and a dispatch entry is simply "publish this range."

**Open for Brad:** does the leg/section split match how he thinks about it, or is it one concept
too many?

### `posture` may not be a field at all

`posture: 'dispatch' | 'report'` conflates **publication history** (a fact), **mutability policy**
(a rule), and **render mode** (a choice).

**The redundancy:** if per-segment `publishedAt` exists, posture is *derivable* — distinct
`publishedAt` values across segments **mean** it shipped forward. So the field is either redundant
with the data or able to contradict it.

**Three more problems:** a dispatch legitimately becomes a report after editing at home; posture may
be **per-segment** (1–5 shipped live, 6 written after falling behind — the normal case); and the
binary already leaks, because a **Guide** is evergreen and revised, neither forward nor backward.

**Proposal (undecided):** drop the stored field. Derive publication history from `publishedAt`, and
keep a separate **authoring `mode`** for declared intent before anything ships. Report is not a
posture — it is the *absence* of one.

**Open for Brad:** is declared intent needed at all, or is derived-from-`publishedAt` enough?

## Other open questions

- **Do `planned` and `actual` belong on the segment, or is a plan a separate Trip?** Currently
  modelled as fields on Segment. The itinerary at `hulahula-plan.md` is a fourth schema in its own
  right, and reconciling the two is unfinished.
- **Perishability.** Conditions beta goes stale in weeks; narrative doesn't. Same document, two
  half-lives, and no way to date or decay the perishable part.
- **Are comments part of the story or chrome?** Load-bearing in three of the twelve reference
  reports.
- **Does the timeline stage force changes here?** If it does, `stage` isn't the right abstraction.
