# 0003 — GPX-first, not GPX-required

**Status:** accepted (2026-07-30)

## Decision

Tracks are the default spine and the happy path. A trip with no track is **valid**, and `stage` may
be omitted entirely.

## Why

The "Secret Strava" requirements doc asserts GPX is "the basis of every story/post." A hard
requirement would exclude three of the twelve reference reports outright — including the
best-written one in the set (~5,000 words, 40–50 photos, no maps at all, geography carried by
annotated satellite crops and prose), and Sidetracked's entire catalogue.

The constraint has a real virtue worth keeping: guaranteeing a spatial spine is what makes
auto-assembly possible. The resolution is defaults, not validation.

## Consequences

- `route`, `initialView`, `stage`, and `sources` are all optional.
- **Stageless longform is a named format**, not a degraded case.
