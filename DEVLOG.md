# DEVLOG

Reverse-chronological. **Append before every PR** — one paragraph: what changed, what surprised
you, what you'd do differently. This is how the next cold session learns what happened.

---

## 2026-08-09 — Live Photos aren't videos; first review notes on White Rim

Brad read the White Rim draft and the first note was that almost every clip should be a still. He
was right, and the data was blunter than the complaint: **37 of the 39 "videos" have a same-stem
still.** They are Live Photos — iOS and Google Photos export one photograph as two files. Only two
were real clips. Emitting both made one photograph look like two media items and turned stills into
things that flash and stop.

**Pairing is the discriminator, not duration.** My first instinct was a duration threshold, which
would have caught most of them and mislabelled the edges: the shortest real clip is 5.4s but two
Live Photos run 3.2 and 3.4s. A clip someone meant to shoot has no still twin. The motion is kept as
`renditions.live` rather than deleted — the fact survives without the story showing it. 123 media
items → 86. The converter learned the same rule, so it stops transcoding 37 files nothing
references.

Also: title moved from `route` to `image` layout (the route layout plays the same beat the overview
plays seconds later), and a logistics chapter now pre-fills from what the tracks know — 165 km, 4
days, 3,069 m — with links and packing left as a TODO, because ingest has no source for permit
details and inventing them would be worse than a gap.

Two chapter ideas captured in `spec/08-chapter-ideas.md`. Writing up the **route flyover** turned up
something worth knowing before building it: most of it already exists, since a flyover is just a run
of `move` keyframes with text between them. What actually blocks it is that **route progress is
monotonic and a flyover has to rewind** — it ends at 1, then the story starts at 0 and redraws the
same line. There is a unit test asserting progress never goes backwards, and it encodes a real
intent, so the fix isn't to delete it. Cheapest answer is probably that the flyover moves the camera
and draws nothing.

That, plus the panorama idea, both run into **the camera problem**: a `move` is four numbers you
cannot picture. Recommended building a camera picker before either chapter, and before an editor —
it is a prerequisite for the flyover rather than a competitor to it.

---

## 2026-08-09 — Pins are computed; `stage.pins` retired

`decisions/0013` stored pins with an explicit expiry: compute them once chapters reference media by
id. `0016` met that condition, so `0017` removes the field. `lib/derive-pins.ts` runs at bake time
beside the media resolver — on the *authored* document, before `mediaId` is collapsed — and the
renderer is unchanged again.

**The surprise was that the drift `0013` predicted had already happened.** Of Brooks Range's 37
pins, 6 carried a caption disagreeing with the chapter showing the same photograph — and **two were
transposed**, `IMG_1801` and `IMG_1827` holding each other's. Two more had degraded typography
(`--` for `—`, `Inupiaq` for `Iñupiaq`). Nobody had noticed, in the only document that had pins.
That is a much better argument for deriving than the one I'd have written from theory, and it
settled where the caption comes from: the chapter reference, because sources hold facts and chapters
hold voice.

`0013` deferred on "the migrated documents have no `sources` to derive from." Fixed at the source
rather than worked around: migration now turns `imagePins` into `sources.media[]` entries. A legacy
pin always *was* a fact about a photograph wearing the wrong hat. All 37 survive — verified against
the legacy document that all 37 point at images the chapters already show, and that all 37 had
`thumbnail === image`, so no thumbnail was lost. White Rim derives 29 from its 29 geotagged images;
its 28 geotagged videos are excluded, because a poster frame on a map reads as a photograph that
isn't one.

Small payoff worth noting: `DerivedPin` is now a real exported type, which replaced three identical
local declarations in the renderer and let `pins={stage?.pins as never}` become `pins={stage?.pins}`.
The `as never` was there precisely because the data was untyped.

**What I could not verify:** that the pins actually render on the map. `SITE_PASSWORD` is now set
locally so every story redirects to `/unlock`, and the automation pane runs `visibilityState:
'hidden'`, where Mapbox has neither `requestAnimationFrame` nor a live WebGL context. The derived
data is checked hard — counts, legacy parity, thumbnails, captions — but the pixels are unconfirmed.
**Open Brooks Range and count pins before trusting this.**

---

## 2026-08-09 — Media identity settled; White Rim ingested end-to-end

**FIT needed no dependency.** The handoff said reading `.fit` was the single biggest gap and
proposed `fit-file-parser` or `@garmin/fitsdk`. Neither was necessary: the messages ingest actually
consumes (`record`, `session`, `sport`, `lap`) have stable field numbers, and `lib/ingest/fit.ts` is
~150 lines of `DataView` maths with no Node APIs, so it runs in a browser or a Worker unchanged.
That is the shape `decisions/0008` wanted. The lesson generalizes: before adopting a parser, check
what fraction of the format you consume — here it was under 5%.

**`mediaId` landed first, deliberately, because the scaffold had to encode the choice.**
`decisions/0016`: every media reference gains an indirect form (`mediaId`, `imageId`), `src` stays
legal for hand-written documents, and `build-trips.ts` collapses indirect → direct at bake time —
so **not one renderer component changed.** The forcing argument wasn't elegance, it was that a
background converter finishes *after* the document is written; with bare paths, every chapter
mentioning a file gets rewritten when its rendition lands. The "exactly one of src/mediaId" rule
lives in `lib/resolve-media.ts` rather than Zod, because `MediaRef` is consumed via `.shape`/
`.extend()` and a `.refine()` returns a ZodEffects that can't be spread — and dangling-id detection
is cross-referential, so Zod couldn't express it either way. 16 unit tests cover the rejections a
fixture can't (a fixture that fails on purpose just fails the build).

**What surprised me was the data, not the code.** Filename order is not chronological — the Lathrop
Canyon *run* sorts between two rides — and the Brooks Range organizer only worked because those
filenames happened to encode order. The run ends at 18:03:21 and the ride to Murphy starts at
18:08:28: five minutes apart, which is the sub-day/multi-mode case arriving unforced and a hard
floor on gap detection. All 123 media files bucketed onto 8 legs (3 with no track) with 66 of them
placed by timestamp alone. The side trip holds 38 files against 4 for the ride after it — the run
is the event and the "day" is connective tissue, which nobody would have recovered from memory.

Two things bit. `ActivityMode` had no **`run`** — added; the enum already separates ski from hike
from ride, so a run was the odd one out. And the iPhone video is **HEVC**, which Safari plays and
Chrome and Firefox do not — it would have looked fine locally and been broken for most readers.
That draws the real line in the ingest architecture: **parsing is client-side work, transcoding is
not.** 500 KB of telemetry in milliseconds versus 350 MB of media, CPU-bound, needing native
binaries. `decisions/0008` is right about the parse half and was never tested against the other.

**What I'd do differently:** I added `poster` to the ingest output after generating the document and
had to regenerate — the media-path audit caught it (162 unique paths, 0 missing), but only because I
ran it. Ingest should assert its own output resolves on disk rather than leaving that to a separate
step. Also: leg labels derived from filenames give you "Camp — after White Rim Mineral Bottom to
Airport", which is what deriving prose from a filename deserves.

**Follow-up, same day — the uploader and the landing line.** The "it re-uploads everything" report
turned out to be a first successful run: a second dry-run skips all 122 correctly. The *real* bug
was that media now lives in **two roots** — `.media/` for ingested stories, the blog repo for
migrated ones — and `MEDIA_SOURCE` held one, so 164 White Rim files reported missing. It is now a
colon-separated list, searched in order. Two smaller fixes fell out: the scanner regexed YAML for
anything shaped like a path, which swept up `renditions` entries and tried to upload phantom
alternates, so it now walks `lib/trips.generated.json` (post-bake, every `mediaId` resolved — exactly
the paths the renderer requests) and skips `renditions` explicitly. And my `media-identity` fixture
had squatted on `/images/white-rim/…`, so its illustrative paths collided with the real story's
namespace; moved to its own.

The landing page's orange line broke in the Tailwind v4 switch: `DrawnLine.tsx` still asked for
`var(--accent)`, which that commit replaced with the `--color-ember` theme token. An undefined var
means no stroke, so the line was drawing invisibly the whole time. **A grep for the old variable
name at rename time would have caught it** — worth doing whenever a token is renamed. Colour
verified in the browser; the scroll-driven *drawing* could not be, because the automation pane runs
with `visibilityState: 'hidden'` and the component coalesces updates through `requestAnimationFrame`,
which never fires there. Needs a human scroll to confirm.

Full friction list in `spec/09-white-rim-friction.md` — that list is the point of the exercise.
Real stories now live in a top-level `stories/`, not in `fixtures/`: a story is not a fixture, and
mixing them would blur what `forward/` means.

**Not done:** media is converted locally into `.media/` (84 images + 39 videos + 39 posters, 355 MB
→ 146 MB) but **not uploaded to R2**, so the story can't be seen with its pictures yet. Nothing is
committed. `stage.pins` should now be computed rather than stored — `decisions/0013`'s expiry
condition is finally met.

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

---

## 2026-08-08 — Legacy stories migrated to moves

`npm run migrate` reads `fixtures/legacy/`, writes `fixtures/migrated/`, and leaves legacy
untouched. All three validate. **27 moves extracted** across the three documents, and 17 legacy
`map` chapters became `move` + `article`.

**Two assertions, not one.** The first compares prose and media in memory — proves the transform is
lossless. The second re-reads the written file and compares again — proves the *serialization* is.
That second one earned its keep: `js-yaml` re-styles block scalars on dump (`|` → `>`), and folding
changes newline handling, so an in-memory check alone could pass while the prose on disk was
quietly mangled. It isn't, but I only know that because the check exists.

The point of both is that a ~3,000-line reformat is unreviewable by eye. The diff is backed by a
machine-checked claim instead: *only these three transforms were applied, nothing else changed.*

**`imagePins` has no home.** Reported as unmigrated and preserved at the top level. It passes
validation only because `Trip` isn't `.strict()` — so it's two gaps, not one, and worth fixing
together.

**Behavioural change, flagged loudly:** the stories now render move-then-read with interpolation
between keyframes, rather than move-while-reading with a jump. That's the intended fix, but it isn't
neutral — the three stories should be looked at in a preview before this is trusted.

---

## 2026-08-08 — Renderer ported; interpolation implemented and tested

`npm run dev` → `/` lists every valid fixture, `/stories/<slug>` renders it. Next 16 + React 19 +
MapLibre. All four documents build as static pages.

**The core is `lib/interpolate.ts`.** A `move` is a keyframe; `pickCamera` decides which pair of
keyframes the reader is between and how far, and the stage applies the blended camera with
`jumpTo` — never `flyTo`, because scroll position *is* the animation parameter and an easing
animation would fight it. That's the whole difference from the old renderer, which called
`map.flyTo` when a chapter entered the viewport.

**Two things went wrong and both were worth the time.**

*First*, I wrote the scroll binding as a free-running `requestAnimationFrame` loop. That re-renders
at 60fps whether or not anything moved, and — the real problem — rAF doesn't fire in a hidden tab,
so the camera silently stops updating. Rewrote it as a passive `scroll`/`resize`/`ResizeObserver`
listener with rAF coalescing: no work when idle, and it recovers as soon as anything moves.

*Second*, **I couldn't see it.** The preview pane reports `visibilityState: "hidden"` with a 0×0
viewport, so there are no pixels to inspect and no layout to measure. Rather than keep poking at it,
I pulled the scroll→camera decision out of the component into a pure function taking geometry
(anchor offsets, viewport height) and wrote 14 tests. The maths and the binding are now verified
headlessly; **only the pixels are unverified, and those need a human at a real browser.**

The tests earned their keep immediately: `blend(a, b, 1)` returned bearing `-180` instead of `180`.
Visually identical, but landing on a keyframe should reproduce it *exactly*, so `blend` now
short-circuits its endpoints.

**Known rough edges** — move anchors are a flat `78vh`, so pacing is uniform rather than tuned;
there's no Mapbox token so the fallback is a route line on flat ground (enough to judge the
motion, not the map); legacy media paths 404 locally since the images still live in the blog repo;
`?debug` shows a live camera readout.

---

## 2026-08-08 — Deployed to Cloudflare Workers; the filesystem bug

Live at **https://oku.brad-mering.workers.dev**, deployed from `main` by GitHub Actions.
Next 16 on Workers via OpenNext 1.20. Bundle is 5,816 KiB raw / **1,190 KiB gzipped** against a
10 MB limit — and nearly all of that is Next's server runtime, not our code.

**The first deploy looked successful and served a broken site.** Index said "No fixtures found";
every story 404'd. Build logs were clean — CI prerendered all seven pages correctly.

The cause: `lib/trips.ts` read `fixtures/` with `node:fs`. With no incremental cache configured,
Next re-renders on demand at request time, and **`workerd` has no filesystem**, so the reads
returned nothing. Reading files is a *build-time* capability; the code silently assumed it was a
runtime one.

Fixed by baking trips into the bundle (`scripts/build-trips.ts` → `lib/trips.generated.json`,
93 KB, wired to `prebuild`/`predev`). Verified in the real runtime with `wrangler dev --local`
before redeploying: 4 stories listed, 7 moves and 7 articles rendering.

**The lesson is the one DEPLOY.md already stated and I didn't follow:** `npm run dev` runs Node,
production runs `workerd`, and only `preview`/`wrangler dev` tells the truth. I deployed straight
from a passing Node build. Cost about fifteen minutes; would have cost far more with a real
audience on it.

Also worth recording: I reported the bundle as "2KB" earlier from measuring `worker.js`, which is
just an entry stub. The real figure needs `wrangler deploy --dry-run --outdir`.

---

## 2026-08-08 — Landing page; R2 bucket bound

Public placeholder at `/`; the fixture index moved to `/stories`. Built around the opening of
Bashō's *Oku no Hosomichi* — the passages Brad picked, which are also where the code name came
from. Attributed to Bashō **and to Donald Keene**, whose 1996 translation these are; verified
rather than assumed, because it's going on a public page and the translation carries its own
authorship.

**The page does what the product does.** A single line draws as you scroll — same idea as the
route interpolation in the story renderer, minus the map. Scroll position drives the drawing
continuously rather than triggering it, and the scroll binding uses the same
passive-listener-plus-rAF-coalescing pattern, not a free-running loop.

Got that wrong once first: the SVG was `position: fixed` with a tall viewBox, so as you scrolled
the drawn portion ran off below the viewport and the line vanished. Absolute and full-page-height
is right — the line should travel *with* the reader, the way a route does.

**Verification was partial and worth being honest about.** The hero renders and looks right. Past
that the preview pane reports `visibilityState: "hidden"` and screenshots come back blank, so I
checked the DOM instead: at 53% scroll three sections are correctly in view and the path is 77%
drawn, which matches the scroll position exactly. **The layout is verified structurally, not
visually.** Somebody should look at the middle and lower thirds on a real browser.

Also bound the R2 bucket (`oku-media`, created via MCP once R2 was enabled). Nothing reads it yet —
the binding is in place so media work doesn't need a config change to start.

---

## 2026-08-08 — Password gate; media routed through R2

**Gate.** Everything except the landing page is behind a single shared password. The cookie holds
an HMAC of a fixed string keyed by the password, so it can't be forged and the password is never
stored client-side. Verified all four paths: landing stays public, protected routes redirect, a
wrong password is rejected, and a forged cookie is rejected.

It **fails open when `SITE_PASSWORD` is unset** — deliberate. This is a curtain, not a lock, and
failing closed on a missing env var would break local dev for no security benefit. Worth being
explicit that it is one password with no accounts and no rate limiting; real auth stays deferred.

**Media.** All 104 referenced files located in the blog repo — 65.7 MB, nothing missing. Upload
script written and dry-run clean, but **not run**: wrangler isn't authenticated here, so that's
Brad's to run after `wrangler login`.

The design decision worth recording: **the documents keep their existing `/images/...` paths.**
A route resolves them out of R2 rather than rewriting every story to point at a bucket. So the
documents never learn where the bytes live, moving storage is a config change, and — usefully —
this defers the `src` vs `mediaId` question rather than forcing it. That question is about linking
chapters to `sources.media[]` metadata, which is a different concern from where files are stored,
and conflating them would have been a mistake.

Also needed `@cloudflare/workers-types` for `R2Bucket` in the route — the Workers runtime types
aren't ambient in a Next project.

---

## 2026-08-08 — Gallery + lightbox ported

First real parity work. Five gallery layouts from the blog renderer, ported from Tailwind to plain
CSS, plus the lightbox (keyboard nav, scroll lock, counter).

The layouts are deliberately five different *shapes* rather than one grid with a column count:
`single` and `duo` are full-bleed and full-height, `trio` and `quad` stagger down the page at
reading width with alternating alignment, and `grid` is a contact sheet on light ground. That
variety is most of what gives these stories their pacing — a run of galleries at one width reads
as a slideshow.

Two things added beyond a straight port: `loading="lazy"` and `decoding="async"` (these stories run
to 30+ images), and a scroll lock while the lightbox is open — without it the scroll-driven camera
keeps running behind the overlay and closing it drops you somewhere else in the story.

Verified all five layouts render in `great-wheel` with correct `/images/...` paths.

**Not verified: the images themselves.** `next dev` has no R2 binding, so media 404s locally —
added `npm run preview:remote` (`wrangler dev --remote`) as the way to see real media without
deploying, but that needs auth I don't have here. Brad's upload was still in flight.

---

## 2026-08-08 — Missing media: the upload regex only matched one prefix

Brad reported missing images and video on Brooks Range. Probed rather than guessed: **all sampled
images returned 200; every `/videos/*` path returned 404.** The images were fine — 9 parallax-video
chapters rendering as broken boxes is what read as "most of the media is missing."

Cause: `scripts/upload-media.ts` matched `/images/...` only. Brooks Range references **two**
prefixes — 81 webp under `/images/`, and 9 mp4 plus 9 jpg posters under `/videos/`. Eighteen files
were silently skipped, and the script reported success because it never knew to look for them.

Fixed the regex to match `/images`, `/videos`, and `/audio`; referenced count went 104 → 122
(85.6 MB). Added `app/videos/[...path]/route.ts` and factored the R2 handler into `lib/media.ts`.

**Added HTTP range support while I was in there.** Without it, video seeking re-downloads the whole
file and Safari won't scrub at all — a plain `bucket.get()` is fine for images and quietly wrong
for video.

Also wired `NEXT_PUBLIC_MAPBOX_TOKEN` into the CI build steps. Worth recording why it isn't a
wrangler secret: **`NEXT_PUBLIC_*` is inlined at build time**, so a runtime secret would never reach
the browser. It goes in GitHub Actions secrets and `.env.local`, and — since it ships in the client
bundle — the Mapbox token should be URL-restricted in their dashboard.

**The lesson worth keeping:** the upload script's "success" was measured against paths it had
found, not against paths the documents actually reference. A completeness check should compare
against the document, not against its own search results.

---

## 2026-08-08 — The skip logic never worked: `wrangler r2 object list` doesn't exist

Brad noticed `upload-media` re-sending all 122 files instead of the 18 new ones.

I had written the skip check against `wrangler r2 object list`. **That command does not exist** —
the CLI only offers `r2 object get`, `put`, and `delete`. I invented it. The call threw, a
`catch` swallowed it, and the script printed a quiet "could not list the bucket; nothing will be
skipped" before uploading everything. It reported the failure, but softly enough to miss.

Two mistakes worth separating: inventing a CLI command without checking, and then wrapping it in a
catch that degraded silently instead of failing loudly. The second is what made the first survive.

Replaced with a local `.media-manifest.json` recording what's been sent, skipping files whose size
is unchanged, written after every successful put so an interrupted run keeps its progress. It's
honestly labelled as *our* record rather than the bucket's truth, with a note to delete it if the
two disagree.

The current run finishes in the right state regardless — it overwrites with identical bytes and
picks up the missing videos.

---

## 2026-08-08 — MapLibre → mapbox-gl: `mapbox://` URLs inside a style

Brad added the token and still saw no map. The secret was present and the deploy that followed it
built with it, so the wiring was fine — the library was wrong.

**MapLibre can't render a Mapbox style.** I was translating `mapbox://styles/mapbox/...` into the
Style API URL, which fetches fine — but the style JSON it returns refers to its own sprites, glyphs
and sources with `mapbox://` URLs, and MapLibre dropped that protocol when it forked from Mapbox GL
JS. So the style loads and every asset inside it silently fails: blank map, no useful error.

I chose MapLibre so the renderer would work with no token, which was reasonable then and wrong
once real styles mattered. The blog has used `mapbox-gl` all along with these exact styles — the
proof was sitting next door.

Swapped to `mapbox-gl`, and took the opportunity to wire `setTerrain` with a raster-dem source
behind the existing `stage.terrain` flag, which is the 3D relief the spec has wanted since
Session 5.

Worth noting for later: mapbox-gl is BSL-licensed and bills per map load, where MapLibre is open
and free. Fine at this scale and with a token already in hand, but it's a dependency with terms —
if that ever matters, the escape route is a non-Mapbox style (Protomaps, OpenFreeMap) plus a
switch back.

---

## 2026-08-08 — The images were never missing; the article chapter wasn't rendering them

Brad reported no maps and no images on Brooks Range. I'd guessed twice already, so I checked the
document instead of the page.

**Brooks Range has no gallery chapters at all.** Its types are `title`, `move`, `article`,
`parallax-video`, `overview`, `logistics`. So the gallery + lightbox work from earlier — real
parity progress — touches this story not at all.

Its photographs live where my renderer wasn't looking:

| Location | Count | Was rendered? |
|---|---|---|
| `article.heroImage` | 10 | no |
| `article.media[]` | 37 | no |
| `imagePins` | 37 | no — still unmodeled in the schema |

My `article` case rendered heading, subheading, stats and prose, and silently dropped every image.
The R2 uploads were fine the whole time; nothing was ever asking for them.

Ported the blog's article properly: hero image beside the prose filling ~85vh with the side
alternating on `align`, a wrapped media-image strip on cooler ground beneath, and full-width videos
that play only while on screen. Kept `preload="none"` — nine videos preloading would cost tens of
megabytes at load.

The structural point I'd missed: **an article is a light panel over the dark stage.** Prose on
paper, the map as the world behind it. Rendering it as a small dark card lost the contrast that
makes the whole layout legible, which is a bigger deal than any single missing image.

Still outstanding on this story: `parallax-video` renders as a plain video, and `imagePins` (37 of
them) has nowhere to go until the schema question is settled.

---

## 2026-08-08 — Switched to Tailwind. It should have been Tailwind from the start.

Brad: *"Why aren't we using tailwind is an interesting question? If tailwind would have gotten us
to parity quicker, why not use it? Why flatten into per component css?"*

Fair, and the honest answer is that **I never considered it.** I scaffolded the app, wrote a
`globals.css`, and kept going. Not a weighed trade-off — an unforced default.

The cost compounded. The blog is Tailwind, so every ported component became a *translation*, and
every translation invented its own values: the gallery had one caption size, the article another,
the landing a third. That inconsistency is what I'd been about to propose fixing with "a design
token layer" — which was really just describing Tailwind badly.

Matched the blog exactly: Tailwind v4, config-free via `@import "tailwindcss"`, plus the typography
plugin. `globals.css` went from **409 lines to 43** — theme, body, `.move-anchor` (kept as CSS
because its height is a tuning knob), and a mapbox canvas rule.

Story components now carry the blog's classes near-verbatim. Verified the emitted CSS contains the
blog-parity utilities and that the article markup has `md:w-[46%]`, `md:min-h-[85vh]` and
`bg-stone-50` in the right counts.

**The lesson for the remaining ports:** parity is now copy-adjust rather than redesign, which is
what Brad was saying when he said clearing that bar isn't as big as I was making it out to be. He
was right — I'd manufactured the difficulty and then argued from it.

---

## 2026-08-08 — Parallax video ported

The mechanic, for anyone reading this cold: a **240vh container**, a `sticky` video that holds for
its duration, and a text block in normal flow *inside* that container so it travels at page speed
while the video stays put. Budget is 80vh of text, 80vh of the video holding alone, 80vh of
release.

Two layouts. `full` puts the video full-bleed with a frosted text card over a directional scrim;
`split` gives the video its own 46% column, letterboxed from `sm:` up so portrait phone clips are
never cropped, with the text alongside. Both flip on `align`.

**One real adaptation rather than a straight copy:** the blog pins to `top: 56px` for its nav bar.
oku has no nav, so the offset is 0 and the video fills the viewport. Copying the 56 would have left
a dark band at the top of every clip.

Brooks Range's five parallax chapters happen to cover all four combinations — full/left, full/right,
split/left, split/right — so this is well exercised. Verified 5 containers at 240vh with 5 sticky
pins.

Worth noting the z-index worked out without fighting: the thread is `relative z-10` above a `fixed
z-0` stage, which makes the thread its own stacking context, so the parallax's internal z-15/z-20
are scoped to it. No ancestor sets `overflow`, which is what would silently break `position:
sticky`.

---

## 2026-08-08 — Chapter nav + reading progress

`ReadingProgress` is a straight port, pinned to `top-0` rather than the blog's `top-14` since oku
has no nav bar to sit under.

**`ChapterNav` needed a decision rather than a port**, which is the thing I'd flagged when listing
what was left. The blog's nav lists every chapter; our thread also contains `move` chapters, which
render nothing. Listing them would fill the menu with unlabelled entries and make the counter
meaningless — "7 / 30" where 11 of the 30 are invisible.

So **the nav's unit is the narrative chapter, not the thread entry.** Moves are excluded. Brooks
Range shows 19, not 30, which is the number a reader would actually count.

Active-chapter tracking reuses the scroll handler that already drives the camera, and deliberately
uses **the same anchor line** — so the nav and the map always agree about where you are. Two
independent notions of "current position" would drift apart and feel broken in a way that's hard to
diagnose.

Each content chapter now carries its `id` as a DOM id, so nav jumps and `#fragment` links work.

---

## 2026-08-08 — imagePins: the data answered the design question

Went in expecting to choose between "pins live on the stage" and "each pin becomes a chapter."
Checked the data first, and it made the question different.

**All 37 pins point at images that already appear in chapters.** Not one is unique content. And
each carries coordinates that came from EXIF, via the same organize script that bucketed photos
into days.

So a pin isn't authored content at all — it's a **geographic index over media the story already
contains**. "This photograph was taken here", where both halves are facts ingest already knows.

The right model is therefore that pins are *computed*: every media item with coordinates that the
story uses, placed on the map. `sources.media[]` already carries `coordinates` in the schema. What's
missing is the link from chapters to media ids — the `src` vs `mediaId` question — and any `sources`
at all in the migrated documents, since the legacy ones never had one.

So: moved `imagePins` → `stage.pins` (it's map-specific and had no business at the trip root),
rendered them, and wrote ADR 0013 recording that **this is denormalized derived data stored on
purpose, with an expiry.** That's exactly the drift the spec exists to prevent, so it's worth being
loud about rather than quietly shipping it as if it were the model.

Rendering is the blog's: a 34px circular thumbnail in a 44px hit area — the visual size stays put
but it's tappable with a thumb — scaling on hover, opening the lightbox on click, with the whole pin
set navigable once open.

Brooks Range's last structural gap is closed. The migration now reports **zero** unmigrated fields.

---

## 2026-08-08 — Camera timing was a model bug; three title layouts

**Timing.** Brad: *"the lines are already largely drawn by the time you see enough of the map card
to see what's happening."* That turned out not to be a tuning value.

Interpolation ran between consecutive move anchors — so the camera's travel was spread across all
the content in between. But articles are opaque white panels, galleries are full-bleed, parallax
video covers the viewport. **The map is only visible during the move anchors.** The entire drawing
budget was being spent behind whatever was covering the map.

Raising the anchor height wouldn't have fixed that. A bigger share of a budget spent in the wrong
place is still spent in the wrong place.

Now: the camera travels across a move anchor's transit of the viewport and **holds** otherwise.
Which also states "move-then-read" precisely — the move happens visibly, then you read. There's a
test named for the regression (*"HOLDS between two moves"*) so it stays caught.

The knob that's actually left is anchor height — a flat `78vh` for every move, when a long
geographic jump probably wants more room than a short one. That argues for a `space` hint on the
move chapter, but I'd rather see how the corrected model feels before adding it.

**Title layouts.** Three presentations as a *property* on the title chapter, not three chapter
types — consistent with the properties-vs-types split in `02-chapter-types.md`:

- `image` — full-bleed photograph, text over a scrim. The blog's default.
- `text` — no photograph; a veil over the stage, so the opening image is the country rather than a
  picture of it.
- `reveal` — a 200vh card where the words land first and the photograph fades in behind them.

Defaults to `image` when an image is present, `text` otherwise, so existing documents are
unaffected. Landed with a fixture showing all three on one page.

---

## 2026-08-08 — Six title variants; named the variant concept

Built `split`, `plate` and `route`, taking title layouts to six. Fixture at
`/stories/title-layouts` shows all of them on one page — which is the point, since these are chosen
by looking rather than by reading a word like "reveal."

**Named the pattern.** `gallery.layout`, `parallax-video.layout` and `title.layout` were three types
that had each independently invented a `layout` property with different value sets. That was a
concept forming by accident, so `spec/07-variants.md` now states it: one chapter type, several
presentations, with the test being *if switching the value would require rewriting the content, it
isn't a variant — it's a different chapter type.*

The rule I most wanted written down is **flat curated presets, never a parameter matrix.** The
tempting refactor is to decompose title layout into media × typography × arrival; three axes of four
values is sixty-four combinations, six of which are good, and it hands the author exactly the
blank-canvas problem the product exists to avoid.

Also drew the boundary explicitly: **structure is inferred, presentation is chosen.** Format,
posture and segmentation are never a dropdown (0012) — but whether a story opens on a photograph or
a sentence is a judgment no amount of ingest can derive.

**`route` breaks a rule, on purpose.** 0012 removed cues from chapters so only `move` drives the
stage, and the route title is a presentation that contributes a keyframe. ADR 0015 argues it earns
the exception: every other variant is a photograph treatment any magazine has, while an opening card
where *the line traces the trip while you read the title* is structurally unavailable to anyone
without tracks fused to a narrative. The two model-pure alternatives were both worse — a following
`move` would draw the line after the title had scrolled away, and letting moves carry prose would
undo the separation 0012 bought.

The ADR ends by saying it's a precedent to argue against rather than follow, which is the part I
expect to matter in three months.

---

## 2026-08-08 — Logistics, the whole-route overview, and title parity

Three ports, all now matching the blog.

**Logistics** was the largest and the most mechanical: intro, a two-column resources grid that
distinguishes downloads from external links by icon, the USGS topo quad table, and the packing list.
Substituted `ember` for the blog's `red-500` — same role in the palette, and using literal red would
have been copying a value rather than a decision.

**The whole-route overview** turned out to be two things, not one. The chapter is a frosted panel
deliberately covering as little of the map as possible — it's the one narrative chapter whose job is
to let you *look at the map* — and behind it sits `FullMap`, the interactive escape hatch.

That escape hatch matters more than it looks. Everywhere else the map is deliberately
non-interactive, because scroll drives the camera and letting the mouse fight it would feel broken.
`FullMap` is the one place a reader can drag, zoom, and tap a photograph to see where it was taken.
It fits the whole traverse on open, which is the reason to open it.

**Title parity** meant replacing my centred card with the blog's actual `image` layout: a hero that
parallaxes at ~⅓ scroll speed, the title anchored bottom-left rather than centred, and the opening
prose in a separate black panel below rather than over the photograph. Those are meaningfully
different decisions and mine were worse — bottom-left with the gradient reads as a magazine cover;
centred reads as a slide.

Verified all three against Brooks Range.

Noted while porting: the blog's overview *fits the whole route* by computing bounds, which under our
model is a camera framing nobody authored. Right now it inherits whatever the preceding move set.
Worth a `fit` keyframe option eventually — the same class of thing as the `route` title.

---

## 2026-08-09 — White Rim source data surveyed; handoff written

Brad dropped the White Rim material at `Projects/whiterim` and asked for a handoff to a fresh
session. Surveyed rather than assumed. `HANDOFF.md` is the result; the findings that matter:

**These are `.fit` files, and nothing in this repo reads FIT.** `gpx-import.mjs` is GPX-only, and
`exiftool` returns filesystem metadata and no telemetry from them (header signature confirms they're
valid FIT). That blocks everything downstream and is the first task.

**Four activities, not three days** — and the fourth is `Lathrop_canyon_run_with_mark.fit`. A run
rather than a ride, a side trip rather than a day, with a second person. It exercises `Leg.mode`,
sub-day segmentation and multi-author in one file — three things the schema was designed for that no
existing document has ever tested. That single file is the best argument for writing this story.

**I was wrong about timezones.** `organize-media.mjs` *requires* `--tz` because "photos record local
time with no offset and it cannot be guessed." 67 of these files carry `OffsetTimeOriginal: -06:00`.
True of the Brooks Range camera, false here — read the offset when present, fall back to the flag.

Other numbers worth having: 123 files / 355 MB (5× Brooks Range), 41 HEIC needing conversion, 39
video clips against Brooks Range's 9, and **only 57 of 123 carrying GPS** — so timestamp alignment
does the work rather than geotags, which is a harder and more honest test of the fusion layer than
Brooks Range gave it. Media spans five days (04-26 → 04-30) for a trip described as three.

Also pointed `CLAUDE.md` at the handoff so a cold session finds it first.
