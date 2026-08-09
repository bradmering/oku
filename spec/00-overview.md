# 00 — Overview

## What the spec is

A **trip document format**, plus the rendering and ingest behaviour around it.

The format is the durable artifact. Renderers change, hosting changes, the product name is still
undecided — the document should outlive all of it. That isn't theoretical: across the reference
corpus, format-migration scar tissue shows up at **every** scale. A personal report stranded "in
the embedded HTML format of my old website." A platform with 521,000 entries mid-migration. An
institution digitizing 31,000 pages. **A trip-report corpus reliably outlives its renderer.**

## Where it came from — derived, not invented

The spec was extracted from work that already existed:

| Source | What it contributed |
|---|---|
| `great-wheel.yaml` (2019) | map-and-gallery story; the original shape |
| `canning-river.yaml` (2022) | same shape, three years later — the drift record |
| `brooks-range.yaml` (2026) | prose story; `article`, `parallax-video`, `overview`, `logistics`, `imagePins` |
| `hulahula-plan.md` frontmatter | a **fourth** schema — the itinerary/plan side |
| `components/GeoStory/` | the map-stage renderer, 11 chapter types |
| `components/TopoStory/` | a second renderer over the same chapter union, with **no map at all** |

**The schema drifted three times in seven years with no version field.** Each story extended it by
accretion. Naming thread + stage is what stops a fourth drift.

## Reading order

1. `01-data-model.md` — trip, stage, cue, segment, chapter. **Start here.**
2. `02-chapter-types.md` — the 11 built and ~30 proposed, with properties separated from types.
3. `03-stages.md` — map, topo, and the timeline test.
4. `04-formats.md` — report / dispatch / guide as projections; plan vs actual.
5. `05-ingest.md` — tracks, media, timeline alignment.
6. `07-variants.md` — one chapter type, several presentations. The rules that keep it from
   becoming a settings panel.
7. `decisions/` — **read before re-opening any settled question.**

## Non-goals right now

Monetization, print, follower graphs, discovery, moderation, billing, SEO, and device OAuth. All
parked; see `decisions/0008`.

## Preview-per-PR — status

**CI enforces the fixture contract today** (`.github/workflows/ci.yml` runs the validator on every
PR). **Visual preview does not exist yet, because there is no app to preview.**

That's the right order, not an oversight: the renderer lives in the blog repo and the legacy
documents need migrating (`06-migration.md`) before porting it is worth doing. Once `app/` renders
a fixture, connecting the repo to Vercel is a dashboard action — one click on the GitHub
integration — and every PR gets a URL automatically.

**When it exists, the review rule is:** open the preview and look. Craft cannot be reviewed from a
diff (`decisions/0009`).
