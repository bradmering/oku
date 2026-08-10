# 02 — Chapter Types

> **Draft.** The consolidated catalogue lives in the orchestrator notes at
> `_control/concepts/trip-report-formats.md`; this file is the version that binds.

## Built today — 11

Carried over from `components/GeoStory/` plus TopoStory's one addition.

| Type | Kind | Notes |
|---|---|---|
| `move` | **stage** | **NEW (0012).** Renders nothing; carries a `Keyframe`. The stage interpolates between consecutive moves |
| `title` | flow | heading, subheading, image, text |
| `splash` | flow | full-bleed image + heading |
| `map` | flow | now an **inline** map block. Legacy `map` chapters (text + flat cue) migrate to `move` + `article` |
| `article` | flow | **heading + `stats` are the base condition; prose is optional.** A "Day 4" marker is this with nothing written |
| `image` | flow | |
| `gallery` | flow | `layout`: single \| duo \| trio \| quad \| grid |
| `video` | flow | |
| `parallax-video` | flow | `layout`: full \| split (split = portrait/phone video) |
| `panorama` | flow | **NEW (0019).** Wide image that pans sideways as you scroll past. `annotations[]` are image-space points (`x`/`y` 0..1, top-left origin, as topo `bounds`); `rate` sets how much scroll the pan costs. Sticky, never `preventDefault` — the reader is never captured. Degrades to a scrollable wide image under reduced motion |
| `overview` | flow | |
| `logistics` | flow | links, topo quads, packing groups |
| `topo` | flow | TopoStory; a `move` carries the image-space `bounds` |

## Proposed

Roughly thirty candidates, grouped. **Every one marked ⭐ was hand-built by an author in the
reference corpus with no tool encouraging it** — the strongest signal a type is real.

**Narrative / voice** — `source-passage` (an extended quote from an *external* work, with citation
metadata; distinct from a participant's voice) · `quote` (a named voice from within the party) ·
`co-author-block` (rendered like a group chat) · `aside`

**Media** — `audio` (player · **ambient section soundscape** · narration spine — three different
things) · `transcript` · ⭐`annotated-image` · `comparison` (before/after) · `embed` ·
`live-embed` (CalTopo/inReach — Dispatch only; **embeds rot**, pair with a static snapshot)

**Geo** — ⭐⭐⭐⭐`route-overlay` (a route traced on terrain with named features — **four
independent sightings** across the corpus, the strongest signal in the set; wants to be clickable
into segments) · `elevation-profile` · `map-flyover`

**Structured** — ⭐`stats-header` · ⭐`conditions` (**time-stamped and perishable**; no current
type is) · `itinerary` · `time-stats` · `gear-list` · `approach-beta` / `descent-beta`

**Social** *(phase 3 — accounts required)* — `comment-thread` · `subscribe` · `action-button`

## ⚠ Not chapter types — properties and modes

**About a third of the proposal list isn't a type at all.** Keeping these separate is what stops
the schema inflating:

- **photo display styles** (window shade · float left · float right · full-width with floating
  caption) → a property on `image`/`gallery`, for photos *interspersed with prose* rather than
  batched
- **elevation-coloured track** → a styling mode on a map/track
- **standalone full map** → just the `map` chapter. `persist` was deleted in `decisions/0012`
- **3D terrain** → a mode on the map stage, not a stage

## Open

- Does `source-passage` reuse the citation model being built for humanities.app rather than
  inventing a second one?
- Is `logistics` a chapter type or the seed of the Guide format? Probably both.
