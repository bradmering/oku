# 0016 — Chapters reference media by id; the bake resolves it

**Status:** accepted (2026-08-09) · **Relates to:** 0003, 0008, 0012, 0013 · **Closes:** the
`src` vs `mediaId` open question in `01-data-model.md`

## Decision

Every media reference in a chapter gains an **indirect form** that points into `sources.media[]`:

| Direct (unchanged) | Indirect (new) | Where |
|---|---|---|
| `src` | `mediaId` | `MediaRef` — article hero + media, video, parallax-video |
| `src` | `mediaId` | gallery images |
| `image` | `imageId` | title, splash, image chapters |

**Exactly one of the pair must be present.** A reference with neither, or with both, is invalid.

**`build-trips.ts` collapses indirect → direct before the renderer ever sees the document.** The
baked JSON contains only concrete paths, so **no renderer component changes.** Resolution is a pure
function in `lib/resolve-media.ts`, called from the bake today and reusable at runtime later.

## Why indirection at all

`sources.media[]` holds `capturedAt` and `coordinates`; chapters held bare path strings. Nothing
connected them, so **fusion knowledge was thrown away at authoring time** — the ingest layer knew
when and where a photograph was taken, wrote it into `sources`, and then the story referenced the
same file by a path that carried none of it.

The forcing function is asynchronous conversion. A background converter (HEIC → WebP, video →
HLS) **finishes after the document is written.** With bare paths, every chapter that mentions a
file has to be rewritten when its rendition lands — a document-wide edit driven by a job, which is
exactly how documents rot. With ids, the converter updates **one** `sources.media[]` entry and
every reference to it follows on the next bake.

Two smaller wins fall out:

- **`type` on article media becomes optional** — it is `kind` on the media item, and the resolver
  fills it in. One less thing to get wrong by hand.
- **Pins become computable.** `decisions/0013` said pins should be derived "once chapters reference
  media by id." That is now true, and 0013's expiry condition is met.

## Why `src` stays legal

**A story with no `sources` must remain writable by hand.** That is the same instinct as
"GPX-first, not GPX-required" (`0003`): the foundation is optional, and a document that skips it is
first-class rather than degraded. Requiring a `sources.media[]` entry to place a single image would
make the simplest possible story the most ceremonious one.

So: **hand-written documents use `src`; ingested documents use `mediaId`.** Both are correct. The
three migrated legacy documents keep working untouched.

## Why the bake, not the renderer

`build-trips.ts` already exists because reading the filesystem is a build-time capability — the
lesson from the production 404s. Reference resolution is the same class of thing: a whole-document
operation with cross-referential lookups, done once, rather than a lookup repeated in every leaf
component with a trip object threaded down to reach it.

It also keeps the failure loud and early. A dangling `mediaId` fails the bake and
`validate-fixtures.ts`, not a reader's page.

## `src` on a media item means "the path to serve"

`MediaItem` gains `renditions?: Record<string, string>` and `poster?: string`.

**`src` is always the canonical servable path**, and `renditions` holds named alternates —
`original`, `thumb`, `hls`, whatever a converter emits. A converter that produces a WebP **updates
`src`** and files the original under `renditions.original`.

This deliberately avoids inventing a rendition ladder or a preference algorithm. The resolver has
no names to know: it reads `src`. Rendition names are converter-defined, not spec-defined — the
same posture as segment labels in `0006`.

## Scope — what is deliberately not covered

- **`stage.pins`** keeps its literal `thumbnail`/`image` strings. Pins are derived data on a
  deprecation path (`0013`); giving them an indirect form would invest in a field we intend to
  delete. Computing them from `sources.media[]` is the follow-on, and it is now unblocked.
- **`topo.foregroundImage`** stays direct. Topo is a separate format whose imagery is drawn, not
  captured, so it has no `sources.media[]` entry to point at.

Both are stated boundaries, not oversights. Extending the pattern to either is a small change if
the need appears.

## Consequences

- `MediaRef.src` becomes optional. **The "exactly one" rule is enforced in the resolver, not in
  Zod**, because `MediaRef` is consumed via `.shape` and `.extend()` and a `.refine()` would return
  a `ZodEffects` that cannot be spread. Dangling-id detection is cross-referential and could not
  live in Zod regardless, so both checks belong in the same place.
- `validate-fixtures.ts` runs the resolver. A broken reference fails a non-legacy fixture.
- Ingest emits `mediaId` everywhere. The White Rim scaffold is the first document to do so.
