# 0002 — Thread + stage

**Status:** accepted (2026-07-22)

## Decision

A story is an ordered **thread** of chapters plus an **optional** persistent **stage** that the
thread drives. Chapters that carry a cue are stage-driving; the rest are flow.

## Why

The original schema had geo fields (`coordinates`, `zoom`, `pitch`, `bearing`, `routeProgress`) on
exactly two chapter types and none on the other eight. That distinction was real but unnamed, so
when prose blocks arrived the geo fields were copied onto them rather than modelled as their own
concern. The schema then drifted three times across three stories with no version field.

The model was already half-built: `TopoStory` imported the shared `Chapter` union, extended it with
one stage-specific type, and shipped with no route, no initial view, and no map. A GPX-free story
format already existed in the codebase.

## Consequences

- GPX demotes from foundation to *one source that can populate a map stage*.
- A format becomes a stage plus a chapter subset — Report, Dispatch, and Guide stop being separate
  schemas and become projections.
