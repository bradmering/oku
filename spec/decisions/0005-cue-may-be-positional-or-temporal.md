# 0005 — A cue may be positional or temporal

**Status:** accepted (2026-07-27) · **Priority: design this early**

## Decision

`Cue` is a discriminated union: `{ kind: 'position' }` or `{ kind: 'time' }`. Build the abstraction
now even though only scroll-driven playback ships first.

## Why

Today scroll position is the only clock. **Two independent features want a temporal cue:**

1. **Audio as the spine** — a narration or podcast track drives the visuals; chapters are cued to
   timestamps. This inverts control: time drives the thread instead of scroll driving everything.
2. **A scrubbed pre-rendered flyover** — the NYT pattern. The camera move is rendered ahead of time
   and scrubbed by scroll, so the cue is a frame offset, not a camera position.

Two unrelated features wanting the same abstraction is the signal that it's real rather than
speculative.

**It also already exists in the data.** The trip has a time axis — GPX timestamps, EXIF
timestamps — and the fusion layer's whole job is aligning media on it. Time-driven playback is the
same timeline used for consumption instead of authoring.

## Consequences

- **Retrofit cost is the reason this is early.** A cue kind touches every chapter. Nearly free now,
  expensive later.
- One timeline, two consumption modes: scroll-driven and time-driven.
