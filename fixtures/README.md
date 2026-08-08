# Fixtures — the conformance suite

**These are the contract.** A trip document that doesn't parse and render here isn't valid,
whatever the prose says.

## ⚠ Two kinds of fixture, and they carry different authority

**`forward/` is the specification.** Documents written to exercise the model deliberately —
including everything the legacy corpus never contained. **These define what the format must
support, and they are the ones that matter.**

**`legacy/` is evidence, not authority.** Four documents that predate the spec. They point the way
— they're how the model was derived — but they are **three hand-written blog stories and an
itinerary**, and the format needs to be far more robust than anything they happen to contain.
**Do not treat them as a specification.** They are a regression check on capability we still intend
to keep, nothing more.

Breaking a legacy fixture is a **legitimate outcome of a deliberate design decision.** It needs a
line in `spec/06-migration.md` explaining the call — not an automatic revert.

## What legacy does NOT cover

Most of the data model. None of these documents contains a segment, a dispatch posture, a second
author, a plan, a time cue, ingest sources, or a trip without a map stage. **The majority of the
schema is unexercised by them and always will be.** That gap is what `forward/` is for.

## Rules

1. **Every format change lands a fixture in `forward/` in the same PR.** No fixture, no merge.
2. **Fixtures are the handshake between contributors.** A spec PR adds the fixture; the renderer PR
   makes it pass. Two people work opposite sides of one feature without blocking.
3. **Never hand-edit `legacy/` to make it pass.** Their value is that they're real and that they
   disagree with each other. Migrate them with a committed script so the migration is reviewable.

## Layout

```
forward/    written to exercise the model — THE specification
  chapters/   one minimal document per chapter type
  formats/    one per named format (report, dispatch, stageless, topo…)
  edge/       no track · no stage · single segment · sub-day splits · multi-author · time cue
legacy/     the four pre-spec documents — evidence, and a regression check
```

## The legacy four

| File | What it contributed |
|---|---|
| `great-wheel.yaml` | 2019 — the original map-and-gallery shape |
| `canning-river.yaml` | 2022 — same shape three years on; the drift record |
| `brooks-range.yaml` | 2026 — prose story; `article`, `parallax-video`, `overview`, `logistics` |
| `hulahula-plan.frontmatter.yaml` | the **fourth** schema — the plan side. Deliberately still failing |
