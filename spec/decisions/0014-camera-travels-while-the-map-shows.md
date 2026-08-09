# 0014 — The camera travels while the map shows, and holds while you read

**Status:** accepted (2026-08-08) · **Refines:** 0012

## The symptom

Brad, 2026-08-08: *"the lines are already largely drawn by the time you see enough of the map card
to see what's happening."*

## The cause — a model bug, not a tuning value

Interpolation ran **between consecutive move anchors**, so the camera's travel was spread across
everything in between: articles, galleries, parallax video.

But those are **opaque**. An article is a white panel; a gallery is full-bleed; a parallax video
covers the viewport. **The map is only visible during the move anchors themselves.** So the entire
drawing budget was spent behind whatever was covering the map, and by the time the map was exposed
the route was already drawn.

Raising the anchor height would not have fixed it — a bigger share of a budget spent in the wrong
place is still spent in the wrong place.

## Decision

**The camera interpolates across a move anchor's transit of the viewport, and holds otherwise.**

- While a move anchor is on screen — which is exactly when the map is visible — the camera travels
  from the previous keyframe to that move's keyframe.
- Between anchors, with content covering the map, the camera **holds** at the last keyframe.

This also states "move-then-read" precisely: the move happens *visibly*, then you read, then the
next move happens.

## Consequences

- `pickCamera` takes each anchor's `{ top, height }` rather than a single offset, since transit
  needs both.
- There is a test named for the regression — *"HOLDS between two moves"* — asserting the camera
  does not creep forward while a long article is on screen. That is the bug, and it should stay
  caught.
- **The remaining tuning knob is anchor height**, currently a flat `78vh` for every move. A long
  geographic jump probably wants more room than a short one, which argues for a `space` hint on the
  move chapter. Not added yet — worth seeing how the fixed model feels first.
