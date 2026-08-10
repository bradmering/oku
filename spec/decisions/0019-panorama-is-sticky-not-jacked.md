# 0019 — The panorama is sticky, not scroll-jacked

**Status:** accepted (2026-08-09) · **Relates to:** 0009, 0016, 0018 ·
**Builds:** `spec/08-chapter-ideas.md` #2

## Decision

A `panorama` chapter shows a wide image that **pans horizontally as the reader scrolls past it**,
with optional annotations naming what's in it.

**It is implemented with `position: sticky`, and never calls `preventDefault`.** The chapter reserves
a tall block of ordinary scroll and pins the image inside it. The pan consumes that distance and
then releases.

## Why that distinction is the whole decision

`08-chapter-ideas.md` flagged the risk before building: *"scroll-jacking is hostile if it goes
wrong — on trackpads with momentum, on mobile, and for anyone who just wants to get past it. It
needs an escape hatch and a hard rule that the reader can always continue down."*

Intercepting wheel events and translating them into horizontal motion is the obvious implementation
and the wrong one. It breaks momentum scrolling, fights touch, strands keyboard and screen-reader
users, and the escape hatch has to be invented and then maintained.

**Sticky positioning needs no escape hatch, because the reader was never captured.** Scrolling
down always scrolls down. The only thing the chapter decides is how much scroll distance it
occupies, which is the same thing every other chapter decides. There is nothing to escape from.

This is also why the release behaviour is unit-tested rather than eyeballed: `panProgress` clamps at
both ends, and the test sweeps a full scroll range asserting `0 ≤ p ≤ 1` and monotonicity. **"The
reader is always released" is a property, not a hope.**

## Annotations reuse image space

`{ x, y }` in `0..1` with a **top-left origin** — the same coordinate idea as `Keyframe.bounds` on
the topo stage. That was the deciding factor in `08-chapter-ideas.md`, and it holds: this is not a
fourth coordinate system, it's the one the format already has.

`x` is required, `y` optional and defaulting just above the middle, because a skyline label almost
always wants the same height and making people restate it is friction. Captions come from the
annotation, not the media item — sources hold facts, chapters hold voice (`0016`).

**Ingest emits panorama chapters with no annotations at all.** It knows where a photograph was taken;
it does not know that the pointed thing on the left is Junction Butte. Naming peaks is authorship.
What ingest *can* do is remove the guesswork: `?debug` reads out the cursor's `x` as you move it
across the image, which is the panorama's version of the camera picker.

## Detection is by aspect ratio, and it is unambiguous

A panorama is a different *kind* of photograph, not a wide one. White Rim's three are **3.47:1 and
wider**; the next widest image in the set is **1.87:1**. A 2.5 threshold separates them with room to
spare, so ingest promotes those three out of the media strip into their own chapters — a 14,000px
panorama rendered as a 200px sliver in a strip is the worst possible use of the best image in the
set.

## The converter had been destroying them

`convert-media.sh` capped every image's **long edge** at 2400px, which turned a 14404×3864 original
into **2400×644** — too small to fill a screen at full height, let alone pan across one. The
feature would have shipped looking broken for a reason that had nothing to do with the feature.

Panoramas now cap **height** instead (1200px), so width follows the aspect ratio: 4473×1200, ~1.1 MB.
The general lesson is that "max edge" is the wrong knob for anything whose shape is the point.

## Consequences

- **`prefers-reduced-motion` degrades to a plainly scrollable wide image**, and the annotation labels
  move into the caption. They are content, not decoration, and losing them to a media query would
  lose the point of the chapter.
- **`rate`** controls how much scroll the pan costs. `1` means a pixel of scroll moves the image a
  pixel sideways, which reads as natural; lower pans faster and costs less page.
- The rendered width is **measured at runtime** rather than stored, since it depends on viewport
  height. That costs a layout pass on load and avoids putting a derived number in the document —
  the same instinct as `0017`.
- This is the **only** chapter that takes over scrolling in any sense, and it should stay that way.
  A second one is a sign the format is drifting toward a slide deck.
