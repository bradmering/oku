# DEVLOG

Reverse-chronological. **Append before every PR** — one paragraph: what changed, what surprised
you, what you'd do differently. This is how the next cold session learns what happened.

---

## 2026-08-01 — Repo scaffolded; spec extracted from existing work

Created the repo under the code name **oku** (奥, "the deep interior" — Bashō). Code name only; the
product name is undecided, with Terra Marginis and Where We Went leading. Oku was ruled out as a
product name purely on domain availability, which is irrelevant for a code name.

Scaffolded `spec/`, `schema/`, `fixtures/`, `app/`, plus `CLAUDE.md` and ten ADRs in
`spec/decisions/`. **The data model in `01-data-model.md` is the substantive piece** — trip · stage ·
cue · segment · chapter, with thread+stage as the organizing idea.

**The spec was derived, not invented.** It comes out of three story YAMLs, an itinerary frontmatter
that turned out to be a fourth schema, and two working renderers. Writing it down mostly meant
*naming* distinctions that were already latent in the code — stage-driving vs flow chapters,
persistence as a chapter property, segment as generic rather than a day.

**What surprised me:** how much of the model was already implied by filenames and field names
rather than by any design. Sub-day segments existed as `Day_6a`/`Day_6b` in GPX filenames. Camera
tilt was being set 20 times across two files with no terrain layer rendered. The `pitch` collision
was already live in a single union.

**Not done:** no schema yet, no fixtures copied in, no app. The three obvious first issues are
extract-and-validate the schema, import the legacy fixtures, and stand up preview-per-PR.

---

## 2026-08-07 — Remote wired; schema, fixtures, and CI landed

Pushed to `github.com/bradmering/oku`. Three things in one pass.

**Legacy fixtures imported unmodified** — the three story YAMLs plus the itinerary frontmatter,
3,063 lines total. Unmodified is the point: their value is that they're real and that they disagree
with each other.

**The schema exists** (`schema/trip.ts`, Zod — one definition gives validation and inferred TS
types). `npm test` validates every fixture and prints a drift report for `legacy/`, failing only on
non-legacy fixtures.

**What surprised me: the first drift report was a false green.** All three stories "passed" at the
chapter level because Zod ignores unknown keys by default, so the actual divergence was invisible.
Making chapter objects `.strict()` — correct for a format spec, since an unknown key is drift or a
typo — immediately surfaced the real finding, and it's smaller than expected: **only two distinct
problems across three documents.**

1. Cue fields (`coordinates`, `zoom`, `pitch`, `bearing`, `routeProgress`, `marker`) sit flat on
   the chapter rather than nested under `cue`. 27 chapters across the three stories.
2. `pitch` means camera tilt everywhere in legacy — the rename to `tilt` is mechanical here, since
   none of these are topo stories so the climbing sense never appears.

Both written up in `spec/06-migration.md` with an order of operations. The plan frontmatter is
deliberately left failing — it has no `chapters` array at all, and force-fitting it into `Trip`
would prejudge the open question of whether a plan is a Segment field or its own Trip.

**CI runs the validator on every PR.** Visual preview is *not* stood up, because there's no app
yet — the renderer still lives in the blog repo. That's the right order: migrate the documents,
then port the renderer, then connect Vercel.

---

## 2026-08-07 — Corrected: legacy fixtures are evidence, not authority

Brad flagged that the repo was over-indexing on the legacy documents: *"these yaml docs are only
valuable because they point the way — they shouldn't be authorities on the eventual schema because
the schema needs to be so much more robust."*

He's right, and the initial framing did real damage: `fixtures/README.md` had "never break legacy"
as a rule, `CLAUDE.md` carried it as an invariant, and the migration codemod was called the obvious
next task. **That sets a ceiling, not a floor** — the schema could only ever be as good as three
hand-written blog stories from 2019–2026.

**The concrete evidence for how wrong that is:** most of the model is unexercised by the legacy
corpus and always will be. No legacy document contains a segment, a dispatch posture, a second
author, a plan, a time cue, ingest sources, or a story without a map. Those aren't edge cases —
`Segment` is a core concept and *nothing* validates it.

Split `fixtures/` into `forward/` (the specification) and `legacy/` (evidence + regression check).
Added ADR 0011. Corrected `CLAUDE.md`, the validator's framing, and `06-migration.md` — which also
owed a correction of its own: it claimed "only two distinct problems" but missed the stage fields
(`mapStyle`/`initialView`/`route` at top level), because `Trip` isn't `.strict()`. Same false-green
that hid the chapter drift. **The envelope is still permissive; unknown top-level keys are silently
ignored.** Worth deciding whether to make `Trip` strict too.

**Priority inverted:** forward fixtures before the codemod. The codemod proves the schema handles
old blog posts; forward fixtures prove it handles the product, and that's where it will break.

---

## 2026-08-07 — Spec review started; `segment` and `posture` under review, build paused

Brad pulled the brakes on implementation — *"you are rushing towards code and I still want to make
sure we have the right angle on our general schema."* Correct. Stopped, and put the spec up for
review instead.

**Useful framing that came out of it:** about half the model is *derived* from working code (the 11
chapter types, cue fields, the stage concept) and about half is *invented* in conversation
(`Segment`, `posture`, `planned`, `TimeCue`, `Sources`, `authors[]`, `persist`). **The invented half
is also the half with no fixtures** — that's where review should concentrate, and it's exactly where
the first two problems turned up.

**`segment` conflates a journey fact with a narrative section.** They usually align, which hid it.
They come apart on a rest day (journey chunk, no narrative), on "the middle days blurred together"
(one section, three chunks), and on Abegg's "Time Stats" (section, not a chunk). The product
actually lives in that gap — derived chunks *propose* authored sections, which is the
half-built-story claim stated precisely. Proposal: split into **Leg** (fact, from ingest) and
**Segment** (authored section), and make segments **contiguous ranges over the flat thread** rather
than containers, so `chapters[]` stays the single ordering authority.

**`posture` may not be a field.** It conflates publication history, mutability policy, and render
mode — and if per-segment `publishedAt` exists, the history is *derivable*, making the field
redundant or capable of contradicting the data. It also breaks on a dispatch edited into a report,
on per-segment posture (falling behind on the trail is the normal case), and on Guides, which are
neither.

**Both paused for Brad overnight.** Recorded in `spec/01-data-model.md` under "UNDER REVIEW" with the
open question for each. **Do not build on either until settled** — that includes the forward
fixtures, since three of the five planned ones exercise exactly these two concepts.

---

## 2026-08-08 — Review resolved: flat thread, moves are keyframes, posture is derived

Brad answered both open questions, and the answers **deleted four invented concepts.**

**No grouping object.** `Segment` is gone from the document. Journey facts live in `sources.legs` as
ingest output; the document has no mirror of them. A "Day 4" heading is just a chapter. The earlier
proposal to split into `Leg` *and* `Segment` was rejected as one concept too many — and "leg" carries
time-and-journey connotations that don't belong on the narrative side anyway.

**`move` is a chapter.** Advancing the stage is a block you drop in, not a property on every chapter.
That removed `cue` from `chapterBase` and deleted `persist` outright — with discrete moves, the stage
just holds the last one.

**The substantive part is interpolation.** A move is a *keyframe*, not a trigger. Brad: *"I want the
line to draw between the points cleanly and smoothly as you scroll, right now its abrupt and
sometimes gets lost because the cue is down low."* Attaching a cue to a content chapter fires when
that chapter enters the viewport, which is why it snaps. Interpolating between consecutive keyframes
fixes it by construction, and `routeProgress` becomes a value to interpolate *toward*.

**That unified the clocks**, which I didn't expect. Progress between keyframes comes from scroll
position or playback time — same machinery. `Stage.clock` picks. The audio-spine format stops being
a special case, which retroactively justifies designing the temporal variant early.

**Posture is derived.** Per-chapter `publishedAt` already carries the history, so a stored field
would be redundant or able to contradict it. Chapters sharing a `publishedAt` are one dispatch
entry — no grouping object needed. The principle underneath: *never ask the author to name the
format.*

**Stats:** heading + `stats: { legId }` are the base condition on a text chapter, prose optional, so
a day marker needs no separate type. Bound explicitly rather than inferred from position.

Wrote the first forward fixture (`formats/dispatch-with-moves.yaml`) and it validates — flat thread,
moves, a rest-day leg with no chapter, two authors, derived dispatch posture. ADR 0012 records all
of it; `02` and `04` updated to match.
