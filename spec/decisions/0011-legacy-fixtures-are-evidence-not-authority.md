# 0011 — Legacy fixtures are evidence, not authority

**Status:** accepted (2026-08-07) · **Corrects:** the framing in the initial `fixtures/README.md`
and `spec/06-migration.md`

## Decision

`fixtures/forward/` **is** the specification. `fixtures/legacy/` is **evidence** — a regression
check on capability we still intend to keep, and nothing more.

**Do not design the schema backwards from the legacy documents.**

## Why

The schema was derived from four pre-spec documents, which was the right way to *start* — it meant
naming distinctions that were already latent rather than inventing a format. But the initial repo
framing then went further and made those documents the conformance bar: "never break an existing
fixture," legacy drift as "the migration list," the codemod as the obvious next task.

**That sets a ceiling, not a floor.** The legacy corpus is three hand-written blog stories and an
itinerary. The format has to be substantially more robust than anything they happen to contain, and
treating them as authoritative caps the schema at what one person needed between 2019 and 2026.

**The gap is not marginal — most of the model is unexercised by them:**

| In the schema | Present in any legacy document? |
|---|---|
| `Segment` (the entire concept) | **no** |
| `posture: 'dispatch'`, per-segment `publishedAt` | no |
| `planned` / plan-vs-actual | no |
| `TimeCue` | no |
| `Sources` (tracks, media, timeline) | no |
| multiple authors | no — all three are single-author |
| a trip with no stage | no — all three have maps |

None of that can ever be validated by the legacy corpus, because none of those documents contains a
segment, a dispatch, a second person, or a story without a map.

## Consequences

- **Priority inverts.** Writing forward fixtures beats running the migration codemod. The codemod
  proves the schema handles old blog posts; forward fixtures prove it handles the product — and
  that is where the schema will actually break.
- **Breaking a legacy fixture is a legitimate design outcome.** It needs a documented rationale in
  `06-migration.md`, not an automatic revert.
- `npm test` continues to fail only on `forward/` fixtures. Legacy prints a drift report.
- **First forward fixtures to write** — chosen to hit the unexercised parts, not to mirror what
  exists: a dispatch with per-segment `publishedAt`; a multi-author trip; a stageless longform
  story; a trip with sub-day segments carrying activity modes and one segment with no track; a
  chapter with a `TimeCue`.

## What this does *not* change

The legacy documents keep their real value: they are **actual working stories**, they disagree with
each other in instructive ways, and they are the reason the drift is measurable at all. Keep them,
keep them unmodified, keep reporting drift. Just don't let them define the target.
