# 0015 — The `route` title drives the stage. It's an exception, and it earns it.

**Status:** accepted (2026-08-08) · **Bends:** 0012 · **Governed by:** `07-variants.md`

## Decision

`title` with `layout: 'route'` contributes a **keyframe**: the card holds over the map while the
whole route draws itself, then the story begins.

Every other presentation is inert. This one is not.

## Why it breaks a rule we made deliberately

`decisions/0012` removed cues from chapters precisely so that **only `move` drives the stage** —
one mechanism, visible as a block, no hidden stage control smeared across content types. That rule
is good and the reasons for it still hold.

The route title violates it. A presentation reaches into the stage.

## Why it's worth it anyway

**Nothing else in the product is structurally unavailable to a competitor.** A full-bleed
photograph, a fading reveal, a split card — Sidetracked has all of them and does them better,
because they employ editors. The opening card where **the line traces the trip while you read the
title** cannot be done by anyone without tracks fused to a narrative. It is the one moment where
the thing that makes this product different is also the first thing a reader sees.

It also answers *where is this* before a word of prose, which is the actual job of an opening card
for a trip story.

The alternatives were worse:

- **Require a following `move`.** Model-pure, but the camera holds while content is on screen
  (`decisions/0014`), so the line would draw *after* the title had scrolled away. That is a
  different, lesser effect.
- **Let `move` carry content.** Re-adds prose to moves, undoing the clean separation 0012 bought.

## Consequences

- `Story` treats a route title as both a keyframe source and its own stage anchor: the card's
  200vh span is the scroll distance the line draws across.
- Its keyframe holds the previous framing and sets `routeProgress: 1` — the opening gesture is
  *here is the whole trip*, not a camera move.
- **This is a precedent to argue against, not to follow.** The next variant that wants stage
  control should be made to explain why it is as differentiating as this one. Most won't be.
