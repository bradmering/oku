# 04 — Formats

A format is **not a schema.** It's a projection over one trip document: a stage, a chapter subset,
and a set of defaults.

## The three axes

| Axis | Question | Values |
|---|---|---|
| **Stage** | what backdrop does the thread drive? | map · topo · **none** |
| **Clock** | what drives playback? | scroll · **time** (audio spine, scrubbed flyover) |
| **Posture** | when is it published? | **dispatch** (forward) · **report** (backward) |

A format is a point in that space. Report = map + scroll + backward. A stageless prose piece =
none + scroll + backward. A narrated slideshow = time-driven.

## Posture is structural, not cosmetic

| | **Dispatch** | **Report** |
|---|---|---|
| Published | *forward* — as the trip happens | *backward* — after, with hindsight |
| Mutability | append-only; entries ship before the next exists | mutable, reorderable |
| Knowledge | can't know the ending | shaped by knowing the ending |
| `publishedAt` per segment | required | meaningless |

**A Report can be a collapsed Dispatch. A Dispatch cannot be authored retroactively** without lying
about when things were known. So Dispatch is the primary capture mode and Report is a derived
projection — which is why the retention argument falls out of the data model rather than being
bolted on.

**A dispatch entry is exactly one segment, published on its own.**

## Plan vs actual

A plan and a report are **structurally the same object**. An itinerary is a story whose segments
are *planned* rather than *recorded*.

| | Plan | Actual |
|---|---|---|
| Guide / Beta | ✓ (a plan with no instance) | — |
| Itinerary | ✓ (before the trip) | — |
| Dispatch | ✓ | partial, accumulating |
| Report | optional | ✓ |

**This inverts the assumed ingestion story.** The per-day skeleton was supposed to be *generated
from GPX after the fact*. But a hand-authored plan is a better skeleton and it exists *before* the
trip — named stops, dates, camera cues, route slices, and a live tracking URL. **The plan post is
the Dispatch skeleton**; GPX then *reconciles* against it rather than generating it.

Worth modelling: **plan↔actual divergence is content.** "Planned 12 miles over the divide; made 8
and camped short." Only expressible if both sit on the same segment.

## Named formats

- **Report** — prose-led, map stage, backward. The showcase.
- **Map-and-gallery** — map carries the narrative, photos punctuate, little prose. *Unnamed until
  now*, but it's the low-effort default that already works.
- **Dispatch / field journal** — one segment at a time, forward.
- **Stageless longform** — prose + batched photos, no map. Sufficient for excellent work; see
  `decisions/0003`.
- **Topo** — pitch-by-pitch, vertical.
- **Guide / beta** — logistics-forward, evergreen. **Deferred** (`decisions/0008`), and possibly
  not a format at all but a container (`decisions/0010`).
- **Audio-spine / narrated slideshow** — time-driven. Nothing in the competitive scan does this.
