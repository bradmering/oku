# 0006 — `segment` is generic, not a day

**Status:** accepted (2026-07-27)

## Decision

A segment is an optional grouping over consecutive chapters with a **format-defined label scheme**.
It is sub-day, may carry an activity mode, and **may have no track**.

## Why

"Day" is one labelling scheme among several. Across the reference corpus the unit is variously a
day, a **pitch** (Abegg's Mjölnir: 23 of them, each with grade, footage, bolt count), a **terrain
phase** (Abegg's Stuart: Approach / Lower Ridge / Middle Ridge / Gendarme / Summit / Descent), a
leg, a country, or nothing at all. Three of those schemes appear in **one author's** work.

The Brooks Range raw data was already doing this in filenames the schema couldn't express:
`Day_6a…`/`Day_6b…` and `Day_7_To_the_Sea`/`Day_7_Portage_to_the_Lagoon`. And `day5` is a rest day
with **no track**, inferred from a gap between two tracks.

The real segment boundary is an **activity-mode change** — a morning climb, a day of paddling, an
evening portage — not a clock time. That matters twice: it's the multi-sport case that incumbents
can't express, and it's **detectable from multi-source tracks**, which makes it an ingestion
feature rather than an authoring chore.

## Consequences

- `track` is optional on a segment.
- `mode` exists and is worth auto-detecting during ingest.
- **A dispatch entry is exactly one segment published on its own** — which is what makes the
  dispatch/report relationship mechanical.
