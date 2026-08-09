# Handoff — build the White Rim story

**Start here.** Then `CLAUDE.md`, then `spec/01-data-model.md`, then the ADRs in
`spec/decisions/`.

This is the first story written *into* the format rather than migrated *out of* the blog — the test
the whole project has been building toward. Brooks Range proved the renderer can reproduce something
Brad already hand-built. White Rim asks whether the tooling works on a trip nobody has told yet.

---

## Where things stand

**Live:** https://oku.brad-mering.workers.dev · landing public, everything else behind
`SITE_PASSWORD` · deploys from `main` via GitHub Actions · media in R2 (`oku-media`).

**Built and at parity with the blog:** article (hero + media strip + inline video), gallery (5
layouts), lightbox, parallax video (full/split), title (6 variants), logistics, whole-route overview
with an interactive `FullMap`, chapter nav, reading progress, map pins.

**Not built:** `Reveal` scroll animations — deliberately deferred, see "Open questions".

**The model, in one line:** a trip is a flat thread of chapters over an optional persistent stage;
`move` chapters are keyframes the stage interpolates between while they're on screen.

---

## The source data — `Projects/whiterim`

Not in this repo (355 MB). Referenced by absolute path.

### `fit/` — four activities, and they are **not** three days

| File | What it is |
|---|---|
| `White_Rim_Mineral_Bottom_to_Airport.fit` | 494 KB |
| `AirPort_to_Murphy.fit` | 303 KB |
| `Murphy_to_rim.fit` | 327 KB |
| **`Lathrop_canyon_run_with_mark.fit`** | 319 KB — **a run, not a ride, with a second person** |

**That fourth file is the most interesting object in this dataset.** It is a different activity
mode, a side trip rather than a day, and it involves someone other than Brad. It exercises three
things the schema was designed for and no existing document has ever tested: `Leg.mode`, sub-day
segmentation, and multi-author.

### `photos/` — 123 files, 355 MB

| Type | Count |
|---|---|
| HEIC | 41 |
| JPG/JPEG | 43 |
| MP4 | 37 |
| MOV | 2 |

- **Dates span 2024-04-26 → 2024-04-30** — five days of media for what Brad describes as a
  three-day trip. Arrival and departure days, probably. Worth resolving before segmenting.
- **Only 57 of 123 carry GPS.** So *timestamp* alignment does the work, not geotags — which is
  exactly what the fusion layer is for, and a better test than Brooks Range gave it.
- Videos carry `CreationDate` with an explicit offset (`2024:04:26 12:20:51-06:00`), same as
  Brooks Range.

---

## ⚠ Four things that will bite

**1. These are `.fit` files. Nothing here reads FIT.**
`scripts/gpx-import.mjs` parses GPX only. FIT is a binary format — verified: the header signature is
right, and `exiftool` returns filesystem metadata and no telemetry at all. This is the single
biggest gap and it blocks everything downstream.

Options, roughly in order of appeal: a JS parser (`fit-file-parser`, or Garmin's `@garmin/fitsdk`)
so ingest stays in-repo and can later run client-side per `decisions/0008`; or convert to GPX once
with GPSBabel and treat FIT as a future problem. **Prefer the parser** — client-side extraction is
already the committed architecture, and a one-off conversion just defers the same work.

**2. The camera timezone is in the EXIF, and I previously claimed it couldn't be.**
67 files carry `OffsetTimeOriginal: -06:00`. `scripts/organize-media.mjs` currently *requires*
`--tz` on the grounds that photos record local time with no offset. That is true of the Brooks Range
camera and **false here.** Read the offset when present; fall back to `--tz` when it isn't.

**3. 41 HEIC files need converting.** `Blog/blog-site/scripts/convert-to-webp.sh` handles HEIC and
needs ImageMagick. Target `/images/white-rim/…` to match the existing key convention.

**4. Video is 4× Brooks Range** — 39 clips against 9. Worth deciding early whether all of them
belong in the story, and remember `preload="none"` is already load-bearing.

---

## What to do

1. **Read the FIT files.** Get four tracks with timestamps out of `fit/`. Nothing else can start
   until this works.
2. **Convert and upload media.** HEIC → webp, then `npm run upload-media` (it reads paths straight
   out of the document, so write the document first or re-run after).
3. **Generalize `organize-media.mjs`** — EXIF offset first, `--tz` as fallback.
4. **Cut segments and write the story.** Four activities, five days of media, one of them a run with
   a second person.
5. **Keep the friction list.** Every place the schema or tooling fights back is the point of the
   exercise — that list is worth more than the story. Add to `spec/06-migration.md` or a new
   `spec/09-white-rim-friction.md`.

---

## Open questions this story will probably force

- **`src` vs `mediaId`.** Chapters carry bare path strings while `sources.media[]` holds capture time
  and coordinates, and nothing connects them. White Rim is the first document that will have real
  `sources`, so this stops being theoretical.
- **Pins should be derived, not stored** (`decisions/0013`). Once `sources.media[]` exists, compute
  them and retire `stage.pins`.
- **A `fit` keyframe option.** The whole-route overview should frame the entire traverse; today it
  inherits whatever the last move set. Same class of problem as the `route` title
  (`decisions/0015`).
- **Move spacing** is a flat `78vh` for every move. A long jump probably wants more room —
  `decisions/0014` argues for a `space` hint but says to feel the corrected timing first.
- **`Reveal`.** Scroll already drives the camera continuously; a second scroll-triggered animation
  may read as busy rather than polished. Try it, don't assume parity is right.

---

## Working notes

```bash
npm run dev             # fast, but NO bindings — story media 404s
npm run preview:remote  # workerd + the real R2 bucket. Use this for media
npm test                # interpolation unit tests + fixture conformance
npm run migrate         # legacy → fixtures/migrated (idempotent)
npm run upload-media    # needs `npx wrangler login` first
```

- **Fixtures are the contract.** Format change ⇒ a fixture in `fixtures/forward/` in the same PR.
- `fixtures/legacy/` is **evidence, not authority** (`decisions/0011`). Don't design backwards from
  three old blog posts.
- Every PR gets a preview URL. **Craft is the differentiator** (`decisions/0009`) — review means
  opening it and looking, not reading a diff.
- Humans merge. Never commit or push a child repo without an explicit green light.
