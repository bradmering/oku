# 0009 — Craft is the differentiator; fusion is table stakes

**Status:** accepted (2026-07-31) · **Supersedes:** the original moat claim

## Decision

The defensible position is the **quality of the reading experience**. Ingestion and fusion are
**table stakes** — necessary, still built, not defensible.

## Why

The original framing was: *"the moat is NOT the editor… the moat is the ingestion + fusion layer,"*
dismissing scrollytelling as a commodity. That was the spine of the concept for eleven sessions.

**Ramblr already has the ingestion and fusion layer.** Trip as the atom, GPX/KML import,
timestamp-based photo geotagging, audio notes, a web editor, Public/Secret/Private visibility,
embeddable output. Feature-for-feature it is the closest thing to this spec that exists — closer
than Polarsteps, ArcGIS StoryMaps, or TrailJournals — and it has been shipping since roughly 2012
without breaking out. Its architecture is inverted: the **track** is the spine, media hangs on
waypoints, text is annotation on a point.

**They built a map with stories attached. This is a story with a map attached.**

Corroborating: ArcGIS StoryMaps has an excellent presentation layer (its `sidecar` block *is*
thread+stage, its `map tour` *is* our segment) and does **no ingestion at all** — every element in
their showcase stories is placed by hand. The best-resourced spatial-storytelling product in
existence didn't build the fusion layer, and the closest thesis-match did build it and it wasn't
enough.

## Consequences

- **Review means opening the preview and looking.** Craft cannot be reviewed from a diff.
- Typography, restraint, pacing, and defaults are product work, not polish.
- Quality comes from **constraint, not capability** — Sidetracked buys it with editors; a
  self-serve tool can only buy it with opinionated templates.
- Assume every feature is copyable. Assume the reading experience is not.
