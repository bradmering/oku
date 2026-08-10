# 0018 — The route flyover draws nothing, and `move.space` exists

**Status:** accepted (2026-08-09) · **Relates to:** 0012, 0014, 0015 ·
**Resolves:** the `space` hint 0014 deferred

## Decision

A **route flyover** is an orientation pass over the whole track before the story starts: the camera
flies the route while the reader scrolls, with a heading between legs to say where they are.

**It draws no route line.** Its moves set `coordinates`, `zoom`, `tilt` and `bearing` and
**deliberately omit `routeProgress`.**

`move.space` is added: scroll distance for one move as a multiple of the default `78vh`.

## Why omitting is the whole answer

The problem this was expected to have: a flyover previews the *entire* route, so it ends at
`routeProgress: 1`; the story then starts at the beginning and must draw the same line again from 0.
Route progress is monotonic — `pickCamera` has a test asserting it never goes backwards while
scrolling down, and that test encodes a real intent (a line that stutters backwards mid-story is the
bug the interpolation model exists to fix). So the rewind looked like it needed new machinery: a
`reset` flag, or a second preview line.

**It needs none.** `resolve()` already fills a partial keyframe from the previous camera:

```ts
routeProgress: kf.routeProgress ?? prev.routeProgress
```

A move that never mentions `routeProgress` inherits it. The flyover runs before anything has drawn,
so it inherits `0` from the initial view and holds there for its whole length. **Nothing rewinds
because nothing advanced.** The monotonic invariant is untouched and the test stays exactly as it
is.

That the cheapest option was also the correct one is worth noticing: the expensive designs were all
answers to a problem created by drawing the line in the first place.

**And it is the better reading.** A flyover's job is orientation — where this is, which way we went.
Drawing the whole route during it spoils the story's own reveal, which is the thing the
interpolation model was built to make good (`decisions/0012`).

## What was actually missing

Almost nothing in the model. **A flyover *is* a run of `move` keyframes with text between them** —
the stage already interpolates between consecutive moves continuously, and nothing ever forbade
twenty in a row. Two real gaps:

**1. Nothing generated the keyframes.** Hand-authoring twenty cameras in YAML is the job nobody
finishes, which is why the camera picker (`/camera`) came first. `lib/ingest/flyover.ts` derives
them from the track: sample each leg, point the camera along the direction of travel, hold zoom and
tilt. Bearing uses a lookahead so it follows the leg rather than the jitter between two adjacent GPS
fixes.

**2. Scroll distance.** Sixteen moves at the default `78vh` is **1,248vh of empty scrolling.** A
flyover frame is a beat, not a chapter.

## `move.space`

`0014` argued for a `space` hint and said to feel the corrected timing first. The flyover is what
made it necessary, and it cuts both ways — a flyover frame wants `0.4`, a long jump between distant
keyframes wants more than `1`.

Implemented as a CSS custom property on `.move-anchor` (`height: calc(78vh * var(--space, 1))`), so
the default stays a tuning knob in one place in CSS rather than a number spread through components.

**Scroll distance is the camera's travel time.** That is the model — scroll position *is* the
animation parameter (`0012`) — so `space` is not styling, it is timing, and it belongs in the
document.

## Consequences

- **The flyover replaces the `overview` chapter**, rather than joining it. They occupy the same slot
  and having both orients the reader twice. `--flyover 0` puts the static overview back.
- Flyover moves are ordinary moves. There is **no `flyover` chapter type**, and adding one would be
  inventing a concept for something the thread already expresses — the trap `0012` deleted four
  concepts for.
- **The negative is the fragile part.** "Never emits `routeProgress`" is invisible in review and
  would rot the first time someone adds it for a plausible-sounding reason, so
  `scripts/test-flyover.ts` asserts it directly rather than trusting the comment.
- `title` with `layout: 'route'` still drives the stage to `routeProgress: 1` (`0015`). **A route
  title and a flyover are alternatives, not companions** — one draws the whole line under the title,
  the other refuses to draw it at all. Using both would be incoherent, and nothing currently stops
  you.
