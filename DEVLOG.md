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
