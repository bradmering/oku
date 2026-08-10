# 05 — Ingest

> **Draft.** The empirical test hasn't run yet — see "The n=2 test" below.

## What it does

Take a pile of tracks and media, put them on **one timeline**, and emit a draft trip document with
segments already cut and media already bucketed.

```
GPX/FIT/KML  ─┐
photos        ├─→  normalize  →  align on one timeline  →  draft Trip
video         │                        ↑
audio        ─┘                  camera-clock offset (must be supplied)
```

## Architecture constraints — both non-negotiable

**Extraction runs client-side.** EXIF and GPX parsing happen in the browser; originals upload
direct to object storage, and only the derived manifest reaches the API. This is not a workaround —
Workers have 128MB isolates and no native binaries, so `sharp` and `exiftool` are unavailable
server-side, and doing it in the browser avoids an upload-then-process round trip entirely.

**Media lives in zero-egress object storage.** For a media-heavy read-mostly product, egress is the
entire cost model — the difference between viable and not at friends-and-family budget. This
decision is independent of where compute runs.

## Known failure modes — from generalizing a working script

The Brooks Range organizer worked and was bespoke to one trip in exactly three ways. All three are
now inputs rather than constants:

| Was hardcoded | Now |
|---|---|
| the list of GPX files and their day labels | derived from filenames, sorted |
| a rest-day rule ("day5 is the gap between day4 and day6a") | generic `--gap` threshold detection |
| a camera clock of UTC-8 | `--tz`, required — **photos record local time with no offset and it cannot be guessed** |

Other things that will bite: mixed capture devices (phone + GoPro + drone); Apple video storing
real capture time in `Keys:CreationDate` rather than `DateTimeOriginal`; segments with no track;
and exiftool argument limits on a large shoot.

## Re-running is safe

`scripts/ingest-trip.ts` merges with whatever is already in the document: it refreshes `sources` and
`stage`, and preserves the entire authored thread — prose, captions, culls, hand-tuned cameras. New
photographs join the article for their leg; deleted chapters stay deleted. See `decisions/0020`.

`--scaffold` regenerates from scratch and discards authored work.

## The n=2 test — the experiment that hasn't run

Everything about auto-assembly rests on **one trip, hand-nursed.** The test is to point a
generalized organizer at a second trip's raw dump, cold, and see whether it produces a usable
skeleton without editing the script.

Given plan/actual (see `04-formats.md`), the sharper version is **reconciliation**: given a plan
*plus* tracks and photos, can it match actual segments to planned ones and surface the divergence?

**If media lands on the right segments unattended, auto-assembly is real. If it needs an hour of
hand-correction per day, the AI-drafting feature is decoration on a chore** and this document needs
rethinking.
