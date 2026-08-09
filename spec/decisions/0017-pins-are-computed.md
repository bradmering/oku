# 0017 — `stage.pins` is retired; pins are computed at bake time

**Status:** accepted (2026-08-09) · **Closes:** the expiry `0013` set on itself ·
**Relates to:** 0012, 0016

## Decision

**`MapStage.pins` is removed from the schema.** Pins are computed by
`lib/derive-pins.ts` from `sources.media[]` and attached to the resolved document by the bake,
exactly like resolved media references (`0016`). No document stores a pin, and no renderer
component changed.

The rule, which is `0013`'s own sentence made executable:

> every image the story uses that carries coordinates, in order of first appearance

Three inputs, all already facts:

| Pin field | Comes from |
|---|---|
| `coordinates` | `MediaItem.coordinates` — EXIF |
| `image` | `MediaItem.src` |
| `thumbnail` | `MediaItem.renditions.thumb`, falling back to `src` |
| `caption` | **the chapter reference that shows the photograph** |

## Why the caption comes from the chapter

`sources` holds facts, chapters hold voice (`0016`) — so `MediaItem` has no caption and the pin
borrows the one authored at the point of use.

That is not just tidiness. **The stored pins had measurably drifted from the chapters they
duplicated.** Of Brooks Range's 37 pins, 6 carried a caption that disagreed with the chapter showing
the same photograph, and the disagreement was not cosmetic:

- **Two were transposed.** `IMG_1801` and `IMG_1827` held each other's captions.
- Two had degraded typography — `--` where the chapter had `—`, and `Inupiaq` where the chapter had
  `Iñupiaq`.
- Two were simply different sentences.

`0013` predicted this in the abstract ("denormalized derived data in a document, which is exactly
the drift the spec exists to prevent"). It turned out to be real, in the only document that had
pins, before anyone noticed. **Deriving resolves it toward the authored, in-context, correctly
typeset chapter text**, which is the better copy in all six cases.

## Why the migration changes shape

`0013` deferred on the grounds that "the migrated documents have no `sources` at all… there is
nothing to derive *from*." That is now fixed at the source rather than worked around: **migration
turns `imagePins` into `sources.media[]` entries.**

A legacy pin always *was* a fact about a photograph — where it was taken — wearing the wrong hat. As
a media item it says the same thing in the place the model has for it, and the bake recomputes the
pins. All 37 Brooks Range pins survive; verified against the legacy document, all 37 point at images
the chapters already show, and all 37 had `thumbnail === image`, so nothing was lost.

## Consequences

- **Pins can no longer be authored, only earned.** A photograph appears on the map because it is in
  the story and has coordinates. There is no field to hand-place one, which is the point.
- **A pin the author does not want is removed by removing the coordinates**, not by editing a pin
  list. That is a worse editing story than a checkbox and is accepted deliberately; if it bites, the
  answer is a `pin: false` on the media item, not the return of a pin array.
- `DerivedPin` is a TypeScript type, not a Zod shape — nothing ever parses one from a file. It is
  exported from `schema/trip.ts` and replaced three identical local declarations in the renderer,
  which is what let `pins={stage?.pins as never}` become `pins={stage?.pins}`.
- White Rim derives 29 pins from its 29 geotagged images; its 28 geotagged *videos* are excluded,
  because a pin renders a photograph and a poster frame standing in for a clip reads as a
  photograph that isn't one.
- **This is the precedent `0013` asked for.** It said anyone adding a second piece of derived data
  to a document should treat it as an argument against, not a pattern to follow. Instead of adding
  one, we removed the first.
