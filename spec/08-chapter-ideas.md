# 08 — Chapter ideas (the bucket list)

> Chapter types we want but have not built. Each entry says **what it is**, **why the existing
> model can't already do it**, and **what it would cost.** An idea that turns out to be expressible
> with `move` + an existing chapter belongs in `02-chapter-types.md` as a recipe, not here — the
> catalogue grows by necessity, not by enthusiasm (`decisions/0009`: fewer knobs, not more).

---

## 1. Route flyover — ✅ BUILT 2026-08-09 (`decisions/0018`)

**The idea (Brad, 2026-08-09).** Instead of opening on a mostly static "explore map", fly the
camera along the entire GPX while the reader scrolls, with short text attached at points along the
way to orient them: where this is, which direction we went, what the big features are. An itinerary
in motion.

**Most of this already exists.** A flyover *is* a run of `move` keyframes interleaved with short
text chapters — the stage already interpolates between moves continuously and draws the route line
as it goes (`decisions/0012`). Nothing in the model forbids fifty moves in a row.

**Two things are genuinely missing.**

**a) Route progress is monotonic, and a flyover needs to rewind.** A flyover previews the *whole*
route, ending at `routeProgress: 1`. The story then starts at the beginning and has to draw the same
line again from 0. Today that is not expressible — the interpolation model assumes progress only
grows, and there is a unit test asserting exactly that ("route progress never goes backwards while
scrolling down"). That test encodes a real intent (the line shouldn't stutter backwards mid-story),
so the fix is not to delete it. Options, unresolved:

- a `reset` on a move, making the rewind explicit and instantaneous rather than interpolated;
- a distinct *preview* line the flyover draws, separate from the story's progress line;
- the flyover draws nothing and only moves the camera, leaving the line to the story.

The third is the cheapest and might be the best — the flyover's job is orientation, and a fully
drawn line arguably spoils the story's own reveal.

**b) Nothing generates the keyframes.** Hand-authoring twenty camera positions in YAML is the worst
job in the format — see "the camera problem" below. Ingest already has the track; it could emit a
flyover of N evenly-spaced moves with bearing following the direction of travel and tilt held. That
is a small function and it makes the feature real.

**Outcome.** (a) evaporated: `resolve()` already inherits an omitted `routeProgress`, so a flyover
that never sets it holds the line at 0 and nothing rewinds. The monotonic test is unchanged. (b) is
`lib/ingest/flyover.ts`. The third option above — draw nothing — was both the cheapest and the
right one.

---

## 2. Panorama — ✅ BUILT 2026-08-09 (`decisions/0019`)

**The idea (Brad, 2026-08-09).** A wide panorama that, when it reaches the viewport, stops the
vertical scroll and pans horizontally across the image instead, then releases. Annotatable, so you
can name peaks along a skyline, point out landmarks, or trace where tomorrow's route goes. (NYT have
run several of these.)

**Why it isn't the existing model.** Every current chapter maps scroll to *time* or *camera*. This
maps scroll to a **horizontal position within an image**, and takes over the scroll while it does —
the only scroll-jacking in the format, which is worth being uneasy about.

**Precedent that helps:** the topo stage already addresses things in **image space** —
`Keyframe.bounds` is `[[x, y], [x, y]]` with a top-left origin. Panorama annotations are the same
idea: a point in image space with a label. Reusing that is what keeps this from being a fourth
coordinate system.

**Risks worth naming before building:**

- **Scroll-jacking is hostile if it goes wrong** — on trackpads with momentum, on mobile, and for
  anyone who just wants to get past it. It needs an escape hatch and a hard rule that the reader can
  always continue down.
- **Reduced motion** has to degrade to a plain scrollable-wide image, not a trap.
- Panoramas are big; this wants a real rendition ladder more than any other chapter
  (`MediaItem.renditions`, `decisions/0016`).

**Outcome.** Built with `position: sticky` and no `preventDefault`, which answers the scroll-jacking
risk by never capturing the reader in the first place — there is nothing to escape from. Release is
unit-tested rather than eyeballed. Annotations reuse image space as hoped. The unforeseen problem
was the converter: a 2400px long-edge cap had been crushing 14404×3864 panoramas to 2400×644, so the
chapter would have shipped looking broken for reasons unrelated to the chapter.

---

## The camera problem — ✅ ADDRESSED 2026-08-09

Both ideas run into the same thing, and it is worth stating separately because it is not a chapter
type: **a `move` is four numbers you cannot picture.** Choosing `coordinates`, `zoom`, `bearing` and
`tilt` by editing YAML and reloading is guesswork, and a flyover multiplies it by twenty.

The fix is not "an editor" in the large. It is a **camera picker**: open the story, drag the map to
the framing you want, and have it hand back the keyframe. Small, dogfoodable, and a prerequisite for
the flyover rather than a competitor to it.

**Built:** `/camera/<slug>`, dev-only. The panorama has the same problem in one dimension and got
the same treatment rather than its own tool — `?debug` on a panorama reads out the cursor's `x`.
**The generalisation worth keeping: never ship a field whose value has to be guessed.** If a number
describes something visual, something should show you the number while you look at the thing.
