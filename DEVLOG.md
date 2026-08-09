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
