# 0004 — Persistence is a chapter property

**Status:** accepted (2026-07-27)

## Decision

Whether a chapter's cue outlives the chapter is a **property on the chapter** (`persist`), not a
separate top-level concept. There is no distinct "stage block."

## Why

Steph Abegg's Mt. Stuart North Ridge report uses a topo **as a chapter** (a single route-overlay
image) *and* **as a spine** (23 pitch sections organizing the whole page) in the same document. The
framing "the topo could drive this, or be a chapter in this" isn't either/or — one artifact does
both.

## Consequences

- "Standalone full map" stops being an anomaly: it's a map chapter with `persist: false`.
- Stage and flow are ends of a spectrum, not two categories.
