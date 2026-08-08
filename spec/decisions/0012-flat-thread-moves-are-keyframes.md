# 0012 — Flat thread, moves are keyframes, posture is derived

**Status:** accepted (2026-08-08) · **Supersedes:** 0004 (persist) · **Amends:** 0005, 0006

## Decision

Four things, from one review:

1. **The thread is flat.** No grouping object in the document. `Segment` is gone.
2. **A `move` is a chapter.** Advancing the stage is a block you drop in, not a property smeared
   across content chapters.
3. **A move is a keyframe, not a trigger.** The stage **interpolates between consecutive moves**
   as the reader scrolls (or as the driving media plays).
4. **Posture is derived, never declared.** No `posture` field, no dispatch-or-report picker.

## Why

### `Segment` was two concepts wearing one name

A **journey fact** (time window, track slice, activity mode, stats — derivable by ingest, true
whether or not anyone writes about it) and an **authored narrative section**. They usually align,
which hid it. They come apart on a rest day (fact, no narrative), on "the middle days blurred
together" (one section, three facts), and on a section that isn't a journey chunk at all.

**The resolution isn't to split it into two document concepts** — an earlier proposal to add
`Leg` *and* `Segment` was rejected as one concept too many, and "leg" already smuggles in time and
journey on the narrative side. Instead: **journey facts live in `sources.legs` and the document has
no grouping object at all.** A "Day 4" heading is just a chapter.

*The data proposes; the author disposes.* Legs scaffold the story — where days break, where moves
go, which photos group — and the author may ignore any of it.

### Moves as blocks, keyframes not triggers

Authoring works by stacking content and then saying *now advance the map*. Making that a visible,
draggable block matches how the work actually happens and removes a property from every chapter.

**The interpolation half is the substantive part.** A cue attached to a content chapter fires when
that chapter enters the viewport — so the map jumps abruptly and, in practice, the route line
drawing gets lost. Brad, 2026-08-08: *"I want the line to draw between the points cleanly and
smoothly as you scroll, right now its abrupt and sometimes gets lost because the cue is down low."*

Treating a move as a **keyframe** and interpolating between consecutive moves fixes that by
construction. `routeProgress` becomes a value to interpolate *toward*, not a state to set.

**And it unifies the clocks.** Progress between keyframes comes from scroll position or from
playback time — same machinery, different clock. The audio-spine format stops being a special case,
which retroactively justifies designing the temporal variant early (0005).

**`persist` (0004) is deleted.** With moves as discrete keyframes, the stage simply holds the last
one until the next. An inline full-bleed map is a different thing: a `map` chapter that renders in
the thread rather than commanding the backdrop.

### Posture is redundant with the data

`posture` conflated publication history (a fact), mutability policy (a rule), and render mode (a
choice). But **per-chapter `publishedAt` already carries the history** — distinct values *mean* it
shipped incrementally. A stored field would be redundant at best and able to contradict the data at
worst, and it breaks on the normal cases: a dispatch edited into a report at home, a trip where
early entries shipped live and later ones didn't, and Guides, which are neither.

**Chapters sharing a `publishedAt` are one dispatch entry.** No grouping object required.

## The product principle underneath

Brad, 2026-08-08: *"I want people to be able to write a dispatch or a multiday story from the same
interface without considering our nomenclature."*

**Never ask the author to name the format.** Report, dispatch, and guide are inferred and rendered —
never selected. Same instinct as quality-through-constraint (0009): fewer knobs, not more.

## Consequences

- `Segment`, `persist`, `posture`, and `cue`-as-a-chapter-property are removed from the schema.
- `Leg` is added under `sources`, as ingest output.
- `MoveChapter` is added; `Keyframe` replaces `Cue`; `Stage.clock` selects scroll or time.
- Text chapters get optional `stats: { legId }` — **heading and stats are the base condition,
  prose is optional**, so a "Day 4" marker needs no separate chapter type.
- **Legacy migration grows a step:** flat cue fields on `map`/`article` chapters become separate
  `move` chapters, which changes rendering from move-while-reading to move-then-read. Deliberate.
