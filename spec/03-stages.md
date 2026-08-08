# 03 — Stages

> **Draft — thin on purpose.** This file firms up once the timeline-stage spike runs.

A **stage** is a persistent surface behind or around the scroll that outlives any single chapter.
**Zero or one per trip. `null` is valid.**

## `map`

Mapbox canvas. Cued by `coordinates` / `zoom` / `tilt` / `bearing` / `routeProgress`.

**`terrain: true` is a mode, not a separate stage.** Top-down 2D reads fine for river miles and
coastal plain and is useless for a mountain crossing — relief needs a camera looking *at* a face.
It is also the automated form of a hand-drawn route overlay, which four separate authors in the
corpus built by hand.

*Note:* the legacy stories already set camera tilt 12 and 8 times respectively **with no terrain
layer in the repo** — the camera moves were authored for a 3D world that was never rendered.

## `topo`

A topo image in image space. Cued by `bounds`. Pitch-by-pitch rather than day-by-day; vertical
rather than geographic.

## `timeline` — proposed, and it is the abstraction's own test

A persistent time axis instead of a map.

**If a timeline stage can be built without touching the chapter model, `stage` is a real
abstraction. If it can't, "stage" is a euphemism for "the map" and this spec needs rewriting.**
Cheap to try, high information either way. It also converges with the audio-spine idea — a timeline
stage is the time axis made visible.

## Prior art worth studying

ArcGIS StoryMaps' **sidecar** block is thread+stage built by another team: media pinned while text
scrolls alongside, the map changing to match, with docked / floating / slideshow layouts. Their
**map tour** (guided, numbered stops) is our `segment`. Independent convergence on the same
structure — and they do the presentation layer very well and the ingestion not at all.
