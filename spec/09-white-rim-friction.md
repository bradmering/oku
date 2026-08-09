# 09 — White Rim friction log

> **The point of the exercise.** White Rim is the first story written *into* the format rather than
> migrated *out of* the blog. Every place the schema or the tooling fought back is recorded here.
> This list is worth more than the story.

Raw dump: 4 FIT files, 123 media files (41 HEIC · 43 JPG · 37 MP4 · 2 MOV), 355 MB.

---

## 1. Nothing read FIT — and no dependency was needed

`scripts/gpx-import.mjs` in the blog parses GPX only. FIT is binary and `exiftool` returns
filesystem metadata and no telemetry.

The handoff proposed `fit-file-parser` or `@garmin/fitsdk`. **Neither was necessary.** The message
subset ingest wants — `record`, `session`, `sport`, `lap` — has stable field numbers, and a decoder
is ~150 lines of `DataView` maths (`lib/ingest/fit.ts`). It is deliberately pure `ArrayBuffer`, so
it runs unchanged in a browser or a Worker, which is what `decisions/0008` asked for.

**Learning:** "we need a parser for X" deserves a look at how much of X we actually consume. Here it
was under 5%.

## 2. Filename order is not chronological — and these are not three days

Sorting the FIT files by name gives the wrong story. The real order:

| Track | Window (UTC) | Mode | Distance |
|---|---|---|---|
| White Rim Mineral Bottom → Airport | 04-27 15:48 → 21:54 | ride | 63.9 km |
| **Lathrop Canyon run with Mark** | 04-28 15:32 → 18:03 | **run** | 12.4 km |
| Airport → Murphy | 04-28 18:08 → 21:52 | ride | 44.5 km |
| Murphy → rim | 04-29 13:06 → 17:08 | ride | 56.3 km |

The Brooks Range organizer derived segment names and order from filenames. **That only worked
because those filenames happened to encode the order.** Ingest now sorts by the first record's
timestamp and treats the filename as a label suggestion only.

**The run ends at 18:03:21 and the ride to Murphy starts at 18:08:28 — five minutes apart.** That is
the sub-day case arriving unforced: one day, two legs, two modes. It also sets a floor on gap
detection — a naive threshold would either invent a leg in that five-minute seam or swallow the
overnight camps.

## 3. `ActivityMode` had no `run` — schema changed

The enum was `hike | paddle | ride | climb | ski | portage | travel | rest`. A trail run is not a
hike, and the enum already separates ski from hike from ride, so collapsing it would have made
running the one activity that doesn't get its own name. **`run` added.**

Worth noting *how* this surfaced: not from designing, but from a real file with `sport=running` in
it. This is exactly what the n=2 test in `05-ingest.md` is for.

## 4. The camera timezone IS in the EXIF — sometimes

`organize-media.mjs` **requires** `--tz` on the grounds that photos record local time with no
offset. True of the Brooks Range camera; **false here.** 67 of 123 files carry
`OffsetTimeOriginal: -06:00`.

But it is not simply the other way round either: **17 photos carry no offset at all.** So the rule
is *prefer the file's own offset, fall back to `--tz`* — and ingest reports how many files needed
the fallback, because a large count is the tell that the fallback is wrong.

**Learning:** the bespoke script hardcoded a constant; the obvious generalization was to make it an
input. The real generalization was to make it a **fallback**.

## 5. Only 57 of 123 files carry GPS — timestamp fusion did the work

66 files were placed on the timeline by capture time alone, and every one of the 123 landed on a
leg. This is a better test of the fusion layer than Brooks Range gave it, and it passed:

| Leg | Files |
|---|---|
| Getting there *(no track)* | 11 |
| Mineral Bottom → Airport | 22 |
| Camp *(no track)* | 19 |
| **Lathrop Canyon run** | **38** |
| Airport → Murphy | 4 |
| Camp *(no track)* | 12 |
| Murphy → rim | 9 |
| Heading home *(no track)* | 8 |

**The story finding hiding in the data:** the side trip is the most-photographed thing on the
trip — 38 files against 4 for the ride that follows it. The "day" is connective tissue; the run is
the event. No one would have found that by remembering the trip.

Three of the eight legs have no track. `Leg.trackId` being optional is load-bearing, not
theoretical.

## 6. The whole route is not every track

The stage route is the continuous traverse — the three rides. The run is an out-and-back from camp,
so concatenating it would double the line back on itself and make `routeProgress` meaningless. It
keeps its own track and its own leg, and contributes nothing to the route.

**Generalized:** a track belongs to the stage route when it advances the journey, not merely when it
exists. Ingest currently decides this by mode (`ride`), which is a heuristic that will be wrong on a
trip that mixes modes along one traverse. **Open.**

## 7. Bare `src` could not survive asynchronous conversion — `decisions/0016`

The open `src` vs `mediaId` question stopped being theoretical here, because White Rim is the first
document with real `sources`. The forcing function was not elegance: **a background converter
finishes after the document is written**, and with bare paths every chapter mentioning a file has to
be rewritten when its rendition lands.

Chapters now carry `mediaId`/`imageId`, and the bake collapses them to literal paths so no renderer
component changed. See `decisions/0016`.

## 8. iPhone video is HEVC — a transcode, not a remux

The 37 MP4s are **HEVC**, which Safari plays and Chrome and Firefox do not. Serving them straight
from R2 would have looked fine on Brad's machine and been broken for most readers.

This is the sharpest line in the ingest architecture. **Parsing and transcoding are not the same
kind of work:**

| | Parse (FIT, EXIF) | Transcode (HEIC, HEVC) |
|---|---|---|
| Input | ~500 KB | ~350 MB |
| Cost | milliseconds | minutes, CPU-bound |
| Needs native binaries | no | yes |
| Where it belongs | **client-side**, per `decisions/0008` | **background service** |

`decisions/0008`'s commitment to client-side extraction is right for the parse half and was never
tested against the transcode half. Local scripts (`scripts/convert-media.sh`) cover it today;
Cloudflare Images and Stream are the obvious destinations, and `MediaItem.renditions` is the place
their output lands. **Not yet decided.**

## 9. Still open

- **`stage.pins` should now be computed.** `decisions/0013` set its expiry at "once chapters
  reference media by id." That is now true, and 57 of these files carry coordinates. Not done.
- **Move spacing** is a flat `78vh`. Eight legs across a 165 km loop will show whether a long jump
  needs more room (`decisions/0014`).
- **A `fit` keyframe.** The overview should frame the whole traverse; it inherits whatever the last
  move set.
- **Leg labels are clumsy.** "Camp — after White Rim Mineral Bottom to Airport" is what deriving a
  label from a filename gets you. The author renames; ingest should probably propose the
  destination instead.
- **`--gap` interacts with mode changes.** 90 minutes worked here only because the run→ride seam is
  five minutes. A trip with a two-hour lunch would invent a leg.
