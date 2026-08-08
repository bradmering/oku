# Fixtures — the conformance suite

**These are the contract.** A trip document that doesn't parse and render here isn't valid,
whatever the prose says.

## Rules

1. **Every format change lands a fixture in the same PR.** No fixture, no merge.
2. **Never break `legacy/`.** Those four documents predate the spec and are the drift record. If a
   change breaks one, either the change is wrong or the break is a deliberate, documented
   migration.
3. **Fixtures are also the handshake between contributors.** A spec PR adds the fixture; the
   renderer PR makes it pass. Two people work opposite sides of one feature without blocking.

## Layout

```
legacy/     the four pre-spec documents — must keep parsing
chapters/   one minimal document per chapter type
formats/    one per named format (report, dispatch, stageless, topo…)
edge/       the awkward cases: no track, no stage, single segment, sub-day splits
```

## To import from the blog repo

Not yet copied — these live in `Blog/blog-site/content/stories/` today:

| File | Why it matters |
|---|---|
| `great-wheel.yaml` | 2019 — the original map-and-gallery shape |
| `canning-river.yaml` | 2022 — same shape three years on; the drift record |
| `brooks-range.yaml` | 2026 — prose story; 2,106 lines, ~70% machine-derivable |
| `hulahula-plan.md` (frontmatter) | the **fourth** schema — the plan side |

Import them **unmodified**. Their value is that they're real and that they disagree with each other.
