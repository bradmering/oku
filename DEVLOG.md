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
