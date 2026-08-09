# 0013 — Image pins belong to the map, and are derived data

**Status:** superseded (2026-08-09) by `0017`, which met the expiry below and removed the field ·
**Relates to:** 0011, 0016

> **The expiry fired.** `sources.media[]` is populated, chapters reference media by id, and pins are
> now computed at bake time. `MapStage.pins` no longer exists. Everything below is retained as the
> reasoning that got there — including the prediction that storing derived data would let it drift,
> which turned out to be true of 6 of the 37 pins. See `0017`.

## Decision

`imagePins` moves from the trip root to **`stage.pins`** — it is map-specific, and had no business
at the top level.

**But the more important finding: pins are derived data.** They are stored today only because the
layer that should compute them does not exist yet.

## Why "derived"

Checked against Brooks Range's 37 pins:

- **All 37 point at images that already appear in chapters.** Not one is unique content.
- Each carries `coordinates`, and those coordinates came from **EXIF**, extracted by the same
  organize script that bucketed photos into days.

So a pin is not a thing an author writes. It is a **geographic index over media the story already
contains** — "this photograph was taken here" — and both halves of that sentence are facts the
ingest layer already knows.

## What this should become

`sources.media[]` already carries `coordinates` and `capturedAt` in the schema. Once chapters
reference media by id rather than by bare `src` — the open question in `01-data-model.md` — pins
compute themselves:

> every media item with coordinates that the story uses, placed on the map

Nobody authors a pin. The data proposes; the author disposes (`decisions/0012`).

## Why not do that now

**The migrated documents have no `sources` at all.** The legacy documents never had one and the
ingest layer isn't built, so there is nothing to derive *from*. Storing pins is the only way to
render them today.

## Consequences

- `MapStage.pins` exists and is marked in the schema as derived-and-temporary.
- Migration moves `imagePins` → `stage.pins`; it is no longer reported as unmigrated.
- **This is denormalized derived data in a document**, which is exactly the drift the spec exists
  to prevent. It is accepted deliberately, with an expiry: when ingest populates `sources.media[]`,
  compute pins and retire the field.
- Anyone adding a *second* piece of derived data to a document should treat this as a precedent to
  argue against, not one to follow.
