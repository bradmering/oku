/**
 * Turn a raw dump — FIT tracks plus a folder of photos and video — into a draft
 * trip document with legs cut and media bucketed.
 *
 *   node --experimental-strip-types scripts/ingest-trip.ts \
 *     --slug white-rim \
 *     --fit   ../whiterim/fit \
 *     --media ../whiterim/photos \
 *     --title "The White Rim" \
 *     --author "Brad Mering" --author "Mark"
 *
 * Options:
 *   --slug SLUG      story slug; also the media key prefix (/images/<slug>/…)
 *   --fit DIR        directory of .fit files
 *   --media DIR      directory of photos/video
 *   --out FILE       output document (default stories/<slug>.yaml)
 *   --tz ±HH:MM      FALLBACK camera-clock offset, used only for files that
 *                    carry no EXIF offset of their own (default -06:00)
 *   --gap MINUTES    untracked span that earns its own leg (default 90)
 *   --dry-run        report without writing
 *
 * This is `spec/05-ingest.md`'s "n=2 test" made runnable: point it at a second
 * trip's raw dump, cold, and see whether the skeleton is usable unedited.
 *
 * **exiftool is a local-only dependency.** It runs here, at ingest time, on a
 * laptop — never in the Worker. See `decisions/0016` on where the parse/transcode
 * line falls.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { dump as yamlDump } from 'js-yaml'
import { decodeFit, toActivityMode, decimate, type FitPoint } from '../lib/ingest/fit.ts'

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const opt = (name: string, fallback: string | null = null) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}
const all = (name: string) =>
  argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []))

const SLUG = opt('slug')
const FIT_DIR = opt('fit')
const MEDIA_DIR = opt('media')
const TZ = opt('tz', '-06:00')!
const GAP_MIN = Number(opt('gap', '90'))
const DRY = argv.includes('--dry-run')

if (!SLUG || !FIT_DIR || !MEDIA_DIR) {
  console.error('Error: --slug, --fit and --media are required.\nSee the header of this file.')
  process.exit(1)
}
const OUT = opt('out', path.join('stories', `${SLUG}.yaml`))!
const AUTHORS = all('author').length ? all('author') : ['Brad Mering']

for (const [label, dir] of [['fit', FIT_DIR], ['media', MEDIA_DIR]] as const) {
  if (!existsSync(dir)) { console.error(`Error: ${label} directory not found: ${dir}`); process.exit(1) }
}

const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z')
const hhmm = (ms: number) => new Date(ms).toISOString().slice(5, 16).replace('T', ' ')
/** End of a span: bare time when it's the same UTC day, date + time when it isn't
 *  — a camp leg that runs overnight must not read as ending before it started. */
const span = (a: number, b: number) =>
  (iso(a).slice(0, 10) === iso(b).slice(0, 10) ? hhmm(b).slice(6) : hhmm(b)).padEnd(11)

// ── tracks ───────────────────────────────────────────────────────────────────
/** "White_Rim_Mineral_Bottom_to_Airport.fit" → "White Rim Mineral Bottom to Airport" */
const humanize = (file: string) =>
  path.basename(file, path.extname(file)).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()

type Track = {
  id: string; file: string; name: string; mode: string
  start: number; end: number
  points: FitPoint[]
  distanceM: number | null; ascentM: number | null; descentM: number | null
  movingTimeS: number | null; highPointM: number | null
}

const fitFiles = readdirSync(FIT_DIR).filter((f) => /\.fit$/i.test(f)).sort()
if (!fitFiles.length) { console.error(`Error: no .fit files in ${FIT_DIR}`); process.exit(1) }

const tracks: Track[] = []
for (const file of fitFiles) {
  const { points, session } = decodeFit(new Uint8Array(readFileSync(path.join(FIT_DIR, file))))
  const located = points.filter((p) => p.lat != null && p.lng != null)
  if (!points.length) { console.warn(`  warning: ${file} has no records — skipped`); continue }
  const alts = located.map((p) => p.altM).filter((a): a is number => a != null)
  tracks.push({
    id: `trk_${slugify(humanize(file))}`,
    file,
    name: humanize(file),
    mode: session ? toActivityMode(session.sport) : 'travel',
    start: points[0].t,
    end: points[points.length - 1].t,
    points: located,
    distanceM: session?.totalDistanceM ?? null,
    ascentM: session?.ascentM ?? null,
    descentM: session?.descentM ?? null,
    movingTimeS: session?.totalTimerS ?? null,
    highPointM: alts.length ? Math.round(Math.max(...alts)) : null,
  })
}
// Filenames are not chronological — the White Rim run sorts between two rides.
tracks.sort((a, b) => a.start - b.start)

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── media ────────────────────────────────────────────────────────────────────
const VIDEO = /\.(mp4|mov|m4v)$/i
const IMAGE = /\.(jpe?g|png|heic|heif|webp)$/i

const mediaFiles = readdirSync(MEDIA_DIR).filter((f) => VIDEO.test(f) || IMAGE.test(f)).sort()
if (!mediaFiles.length) { console.error(`Error: no media in ${MEDIA_DIR}`); process.exit(1) }

type Exif = {
  FileName: string
  DateTimeOriginal?: string
  CreateDate?: string
  OffsetTimeOriginal?: string
  CreationDate?: string
  GPSLatitude?: number
  GPSLongitude?: number
}

const exif: Exif[] = []
const CHUNK = 200
for (let i = 0; i < mediaFiles.length; i += CHUNK) {
  const out = execFileSync('exiftool', [
    '-json', '-FileName', '-DateTimeOriginal', '-CreateDate', '-OffsetTimeOriginal',
    '-Keys:CreationDate', '-GPSLatitude#', '-GPSLongitude#',
    ...mediaFiles.slice(i, i + CHUNK).map((f) => path.join(MEDIA_DIR, f)),
  ], { maxBuffer: 128 * 1024 * 1024 }).toString()
  exif.push(...JSON.parse(out))
}

/**
 * Capture time in UTC.
 *
 * The Brooks Range organizer required a `--tz` because "photos record local time
 * with no offset". That is true of *that* camera and false here — 67 of these
 * files carry `OffsetTimeOriginal`. So: **prefer the file's own offset, fall back
 * to `--tz`.** Videos keep carrying it in `Keys:CreationDate`.
 */
let usedFallbackTz = 0
function capturedAt(e: Exif): number | null {
  if (e.CreationDate) {
    const m = String(e.CreationDate).match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})([+-]\d{2}:\d{2})/)
    if (m) return Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]}`)
  }
  for (const field of ['DateTimeOriginal', 'CreateDate'] as const) {
    const raw = e[field]
    if (!raw) continue
    const m = String(raw).match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
    if (!m) continue
    const offset = e.OffsetTimeOriginal ?? TZ
    if (!e.OffsetTimeOriginal) usedFallbackTz++
    return Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`)
  }
  return null
}

type Item = {
  id: string; src: string; original: string; kind: 'image' | 'video'
  t: number; lat: number | null; lng: number | null; legId?: string
}

const items: Item[] = []
const undated: string[] = []
for (const e of exif) {
  const t = capturedAt(e)
  if (t == null) { undated.push(e.FileName); continue }
  const isVideo = VIDEO.test(e.FileName)
  const stem = path.basename(e.FileName, path.extname(e.FileName))
  items.push({
    id: `med_${slugify(stem)}`,
    // The path we intend to SERVE. HEIC/JPG become webp, MOV becomes mp4 —
    // conversion is a separate step; the document names the destination.
    src: isVideo ? `/videos/${SLUG}/${stem}.mp4` : `/images/${SLUG}/${stem}.webp`,
    original: e.FileName,
    kind: isVideo ? 'video' : 'image',
    t,
    lat: e.GPSLatitude ?? null,
    lng: e.GPSLongitude ?? null,
  })
}
items.sort((a, b) => a.t - b.t)

// Ids must be unique — IMG_2424.HEIC and IMG_2424.MP4 share a stem.
const seen = new Map<string, number>()
for (const it of items) {
  const n = (seen.get(it.id) ?? 0) + 1
  seen.set(it.id, n)
  if (n > 1) it.id = `${it.id}-${it.kind}`
}

// ── legs ─────────────────────────────────────────────────────────────────────
// Tracked legs come from the FIT files. The spans between them become untracked
// legs when they exceed --gap and actually contain media — a rest day is a real
// leg with no track, and the run→ride handoff (5 minutes) must NOT become one.
type Leg = {
  id: string; label: string; start: number; end: number
  mode: string; track?: Track
}

const legs: Leg[] = []
const firstMedia = items[0]?.t ?? tracks[0].start
const lastMedia = items[items.length - 1]?.t ?? tracks[tracks.length - 1].end

const spanHasMedia = (a: number, b: number) => items.some((m) => m.t >= a && m.t <= b)
const pushGap = (start: number, end: number, label: string, id: string) => {
  if (end - start <= GAP_MIN * 60_000) return
  if (!spanHasMedia(start, end)) return
  legs.push({ id, label, start, end, mode: 'rest' })
}

if (firstMedia < tracks[0].start) {
  pushGap(firstMedia, tracks[0].start, 'Getting there', 'leg_arrival')
}
tracks.forEach((track, i) => {
  legs.push({
    id: `leg_${slugify(track.name)}`,
    label: track.name,
    start: track.start,
    end: track.end,
    mode: track.mode,
    track,
  })
  const next = tracks[i + 1]
  if (next) pushGap(track.end, next.start, `Camp — after ${track.name}`, `leg_camp_${i + 1}`)
})
if (lastMedia > tracks[tracks.length - 1].end) {
  pushGap(tracks[tracks.length - 1].end, lastMedia, 'Heading home', 'leg_departure')
}
legs.sort((a, b) => a.start - b.start)

// Bucket media. Anything outside every leg attaches to the closest preceding one.
for (const it of items) {
  const inside = legs.find((l) => it.t >= l.start && it.t <= l.end)
  if (inside) { it.legId = inside.id; continue }
  let best: Leg | undefined
  for (const l of legs) if (l.start <= it.t) best = l
  it.legId = (best ?? legs[0])?.id
}

// ── route ────────────────────────────────────────────────────────────────────
// The stage route is the CONTINUOUS traverse. The Lathrop run is an out-and-back
// side trip from camp, so including it would double back over the loop and make
// `routeProgress` meaningless. It keeps its own track and its own leg.
const routeTracks = tracks.filter((t) => t.mode === 'ride')
const routePoints = routeTracks.flatMap((t) => t.points)
const route = decimate(routePoints, 700).map(
  (p) => [Number(p.lng!.toFixed(5)), Number(p.lat!.toFixed(5))] as [number, number],
)

/** Fraction along the concatenated route at a moment in time. */
function progressAt(ms: number): number {
  let before = 0
  for (const t of routeTracks) {
    if (ms >= t.end) { before += t.points.length; continue }
    if (ms <= t.start) break
    const i = t.points.findIndex((p) => p.t >= ms)
    before += i === -1 ? t.points.length : i
    break
  }
  return routePoints.length ? Math.min(1, before / routePoints.length) : 0
}

const lngs = route.map((p) => p[0])
const lats = route.map((p) => p[1])
const centre: [number, number] = [
  Number(((Math.min(...lngs) + Math.max(...lngs)) / 2).toFixed(5)),
  Number(((Math.min(...lats) + Math.max(...lats)) / 2).toFixed(5)),
]

// ── document ─────────────────────────────────────────────────────────────────
const startDate = iso(legs[0].start).slice(0, 10)
const endDate = iso(legs[legs.length - 1].end).slice(0, 10)

const mediaFor = (legId: string) => items.filter((m) => m.legId === legId)
const firstImage = (legId: string) => mediaFor(legId).find((m) => m.kind === 'image')

const chapters: unknown[] = []

const opener = items.find((m) => m.kind === 'image')
chapters.push({
  id: 'ch_title',
  type: 'title',
  layout: 'route',
  heading: opt('title', humanize(SLUG)),
  subheading: `${startDate} — ${endDate}`,
  ...(opener ? { imageId: opener.id } : {}),
})

chapters.push({ id: 'ch_overview', type: 'overview', heading: 'The route' })

for (const leg of legs) {
  const legMedia = mediaFor(leg.id)
  const hero = firstImage(leg.id)
  const strip = legMedia.filter((m) => m.id !== hero?.id)

  chapters.push({
    id: `ch_move_${leg.id}`,
    type: 'move',
    to: {
      coordinates: leg.track?.points.length
        ? [Number(leg.track.points[0].lng!.toFixed(5)), Number(leg.track.points[0].lat!.toFixed(5))]
        : centre,
      zoom: leg.track ? 12 : 10,
      tilt: 50,
      routeProgress: Number(progressAt(leg.end).toFixed(4)),
    },
  })

  chapters.push({
    id: `ch_${leg.id}`,
    type: 'article',
    heading: leg.label,
    // Deliberately no `text`. Heading + stats is the base condition; the prose
    // is what the author brings. See spec/01-data-model.md.
    ...(leg.track ? { stats: { legId: leg.id } } : {}),
    ...(hero ? { heroImage: { mediaId: hero.id } } : {}),
    ...(strip.length ? { media: strip.map((m) => ({ mediaId: m.id })) } : {}),
  })
}

const doc = {
  specVersion: 1,
  id: `trip_${SLUG}`,
  slug: SLUG,
  title: opt('title', humanize(SLUG)),
  dates: { start: startDate, end: endDate },
  visibility: 'unlisted',
  authors: AUTHORS.map((name) => ({ id: `auth_${slugify(name)}`, name })),
  sources: {
    tracks: tracks.map((t) => ({
      id: t.id,
      name: t.name,
      startedAt: iso(t.start),
      endedAt: iso(t.end),
      points: decimate(t.points, 400).map(
        (p) => [Number(p.lng!.toFixed(5)), Number(p.lat!.toFixed(5))],
      ),
    })),
    legs: legs.map((l) => ({
      id: l.id,
      label: l.label,
      startedAt: iso(l.start),
      endedAt: iso(l.end),
      mode: l.mode,
      ...(l.track ? { trackId: l.track.id } : {}),
      ...(l.track ? {
        stats: {
          ...(l.track.distanceM != null ? { distanceM: Math.round(l.track.distanceM) } : {}),
          ...(l.track.ascentM != null ? { ascentM: l.track.ascentM } : {}),
          ...(l.track.descentM != null ? { descentM: l.track.descentM } : {}),
          ...(l.track.movingTimeS != null ? { movingTimeS: Math.round(l.track.movingTimeS) } : {}),
          ...(l.track.highPointM != null ? { highPointM: l.track.highPointM } : {}),
        },
      } : {}),
    })),
    media: items.map((m) => ({
      id: m.id,
      src: m.src,
      kind: m.kind,
      // Every video needs a still: iPhone clips are HEVC and must be transcoded
      // anyway, so the poster comes out of the same ffmpeg pass.
      ...(m.kind === 'video' ? { poster: m.src.replace(/\.mp4$/, '.jpg') } : {}),
      capturedAt: iso(m.t),
      ...(m.lat != null && m.lng != null
        ? { coordinates: [Number(m.lng.toFixed(5)), Number(m.lat.toFixed(5))] }
        : {}),
      ...(m.legId ? { legId: m.legId } : {}),
      // Where the file came from, so a converter can be re-run or audited.
      renditions: { original: `raw/${m.original}` },
    })),
  },
  stage: {
    type: 'map',
    clock: 'scroll',
    terrain: true,
    initialView: { coordinates: centre, zoom: 10, tilt: 45, bearing: 0 },
    route,
  },
  chapters,
}

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\nTracks (${tracks.length}, chronological — filenames are not):\n`)
for (const t of tracks) {
  console.log(
    `  ${t.name.padEnd(38)} ${hhmm(t.start)} → ${span(t.start, t.end)}` +
    `${t.mode.padEnd(6)} ${((t.distanceM ?? 0) / 1000).toFixed(1).padStart(5)} km  ${t.points.length} pts`,
  )
}

console.log(`\nLegs (${legs.length}) and their media:\n`)
for (const l of legs) {
  const m = mediaFor(l.id)
  const tag = l.track ? '' : '  (no track)'
  console.log(
    `  ${l.label.padEnd(38)} ${hhmm(l.start)} → ${span(l.start, l.end)}` +
    `${String(m.length).padStart(3)} files (${m.filter((x) => x.kind === 'video').length} video)${tag}`,
  )
}

const geo = items.filter((m) => m.lat != null).length
console.log(`\n${items.length} media item(s) · ${geo} geotagged · ${items.length - geo} placed by timestamp alone`)
console.log(`${usedFallbackTz} file(s) had no EXIF offset and used the --tz fallback (${TZ})`)
if (undated.length) console.log(`${undated.length} file(s) had no usable timestamp: ${undated.join(', ')}`)
console.log(`Route: ${routePoints.length} points from ${routeTracks.length} ride track(s), decimated to ${route.length}`)

if (DRY) {
  console.log('\n[dry-run — nothing written]\n')
} else {
  mkdirSync(path.dirname(OUT), { recursive: true })
  const header =
    `# GENERATED by scripts/ingest-trip.ts — a SCAFFOLD, not a finished story.\n` +
    `# The data proposes; the author disposes. Cut media, merge legs, add the voice.\n` +
    `# Re-running overwrites this file.\n\n`
  writeFileSync(OUT, header + yamlDump(doc, { lineWidth: 100, noRefs: true }))
  console.log(`\nWrote ${OUT}\n`)
}
