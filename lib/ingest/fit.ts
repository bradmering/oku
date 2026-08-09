/**
 * A minimal FIT decoder — no dependencies, no Node APIs.
 *
 * FIT is Garmin's binary activity format and nothing in this repo read it.
 * `fit-file-parser` and `@garmin/fitsdk` both exist; neither is needed. The
 * message subset ingest actually wants — `record`, `session`, `sport`, `lap` —
 * has stable field numbers, and decoding it is ~150 lines of `DataView` maths.
 *
 * **Deliberately pure `ArrayBuffer`.** `decisions/0008` commits to extraction
 * running client-side, and parsing is the half of that which genuinely belongs
 * there: a 500 KB telemetry file is nothing like transcoding 350 MB of media
 * (see `decisions/0016` and `spec/09-white-rim-friction.md`). This file runs
 * unchanged in a browser, a Worker, or Node.
 *
 * Not implemented: developer fields (skipped by size), accumulators, and every
 * message type ingest has no use for. Add them when something needs them.
 */

/** FIT timestamps count seconds from 1989-12-31T00:00:00Z. */
const FIT_EPOCH_MS = 631_065_600_000
/** Positions are semicircles: 2^31 semicircles = 180°. */
const SEMICIRCLE = 180 / 2 ** 31

type Reader = (d: DataView, o: number, le: boolean) => number | bigint

/** base type byte → [size, reader, invalid sentinel]. The high bit marks
 *  endian-dependent types, which is why the keys aren't sequential. */
const BASE: Record<number, [number, Reader, number | null]> = {
  0x00: [1, (d, o) => d.getUint8(o), 0xff],            // enum
  0x01: [1, (d, o) => d.getInt8(o), 0x7f],             // sint8
  0x02: [1, (d, o) => d.getUint8(o), 0xff],            // uint8
  0x83: [2, (d, o, le) => d.getInt16(o, le), 0x7fff],
  0x84: [2, (d, o, le) => d.getUint16(o, le), 0xffff],
  0x85: [4, (d, o, le) => d.getInt32(o, le), 0x7fffffff],
  0x86: [4, (d, o, le) => d.getUint32(o, le), 0xffffffff],
  0x07: [1, (d, o) => d.getUint8(o), 0x00],            // string
  0x88: [4, (d, o, le) => d.getFloat32(o, le), null],
  0x89: [8, (d, o, le) => d.getFloat64(o, le), null],
  0x0a: [1, (d, o) => d.getUint8(o), 0x00],            // uint8z
  0x8b: [2, (d, o, le) => d.getUint16(o, le), 0x00],
  0x8c: [4, (d, o, le) => d.getUint32(o, le), 0x00],
  0x0d: [1, (d, o) => d.getUint8(o), 0xff],            // byte
  0x8e: [8, (d, o, le) => d.getBigInt64(o, le), null],
  0x8f: [8, (d, o, le) => d.getBigUint64(o, le), null],
  0x90: [8, (d, o, le) => d.getBigUint64(o, le), null],
}

/** FIT `sport` enum → the names we care about. */
const SPORT: Record<number, string> = {
  0: 'generic', 1: 'running', 2: 'cycling', 5: 'swimming',
  11: 'walking', 12: 'transition', 17: 'hiking', 18: 'multisport',
}

export type FitPoint = {
  /** Unix ms. */
  t: number
  lat: number | null
  lng: number | null
  altM: number | null
  distM: number | null
}

export type FitSession = {
  startedAt: number | null
  endedAt: number | null
  sport: string
  totalTimerS: number | null
  totalDistanceM: number | null
  ascentM: number | null
  descentM: number | null
}

export type FitFile = {
  points: FitPoint[]
  session: FitSession | null
  lapCount: number
}

type FieldDef = { num: number; size: number; type: number }
type MsgDef = { global: number; le: boolean; fields: FieldDef[]; devSizes: number[] }

const at = (t: number | undefined) => (t == null ? null : FIT_EPOCH_MS + t * 1000)

export function decodeFit(bytes: Uint8Array): FitFile {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  if (bytes.byteLength < 12) throw new Error('too short to be a FIT file')
  const headerSize = d.getUint8(0)
  const signature = String.fromCharCode(...bytes.subarray(8, 12))
  if (signature !== '.FIT') throw new Error(`not a FIT file (signature "${signature}")`)

  const dataSize = d.getUint32(4, true)
  let pos = headerSize
  const end = Math.min(headerSize + dataSize, bytes.byteLength)

  const defs = new Map<number, MsgDef>()
  const points: FitPoint[] = []
  let session: FitSession | null = null
  let sportFallback: string | null = null
  let lapCount = 0

  while (pos < end) {
    const header = d.getUint8(pos++)
    const compressed = (header & 0x80) !== 0
    const local = compressed ? (header >> 5) & 0x03 : header & 0x0f

    // ── definition message
    if (!compressed && (header & 0x40) !== 0) {
      pos++ // reserved
      const le = d.getUint8(pos++) === 0
      const global = d.getUint16(pos, le); pos += 2
      const count = d.getUint8(pos++)
      const fields: FieldDef[] = []
      for (let i = 0; i < count; i++) {
        fields.push({ num: d.getUint8(pos), size: d.getUint8(pos + 1), type: d.getUint8(pos + 2) })
        pos += 3
      }
      const devSizes: number[] = []
      if ((header & 0x20) !== 0) {
        const devCount = d.getUint8(pos++)
        for (let i = 0; i < devCount; i++) { devSizes.push(d.getUint8(pos + 1)); pos += 3 }
      }
      defs.set(local, { global, le, fields, devSizes })
      continue
    }

    // ── data message
    const def = defs.get(local)
    if (!def) throw new Error(`data message for undefined local type ${local} at byte ${pos}`)

    const v: Record<number, number> = {}
    for (const f of def.fields) {
      const base = BASE[f.type]
      if (base && f.type !== 0x07 && f.size === base[0]) {
        const raw = base[1](d, pos, def.le)
        const value = typeof raw === 'bigint' ? Number(raw) : raw
        if (value !== base[2]) v[f.num] = value
      }
      // Strings and arrays are skipped by size — nothing here needs them.
      pos += f.size
    }
    for (const size of def.devSizes) pos += size

    switch (def.global) {
      case 12: // sport
        sportFallback = SPORT[v[0]] ?? String(v[0])
        break
      case 19: // lap
        lapCount++
        break
      case 18: // session — one per activity; the last wins
        session = {
          startedAt: at(v[2]),
          endedAt: at(v[253]),
          sport: SPORT[v[5]] ?? String(v[5]),
          totalTimerS: v[8] != null ? v[8] / 1000 : null,
          totalDistanceM: v[9] != null ? v[9] / 100 : null,
          ascentM: v[22] ?? null,
          descentM: v[23] ?? null,
        }
        break
      case 20: { // record
        if (v[253] == null) break
        points.push({
          t: FIT_EPOCH_MS + v[253] * 1000,
          lat: v[0] != null ? v[0] * SEMICIRCLE : null,
          lng: v[1] != null ? v[1] * SEMICIRCLE : null,
          // altitude is stored scaled by 5 with a 500 m offset
          altM: v[2] != null ? v[2] / 5 - 500 : null,
          distM: v[5] != null ? v[5] / 100 : null,
        })
        break
      }
    }
  }

  if (session && session.sport === 'generic' && sportFallback) session.sport = sportFallback
  return { points, session, lapCount }
}

/** FIT sports → the schema's `ActivityMode`. */
export function toActivityMode(sport: string): string {
  switch (sport) {
    case 'cycling': return 'ride'
    case 'running': return 'run'
    case 'hiking':
    case 'walking': return 'hike'
    case 'swimming': return 'paddle'
    default: return 'travel'
  }
}

/**
 * Thin a track for storage. Keeps the first and last point and every Nth
 * between — a full ride is ~15,000 points and a drawn route line needs
 * hundreds, not thousands.
 */
export function decimate<T>(points: T[], target: number): T[] {
  if (points.length <= target) return points.slice()
  const step = (points.length - 1) / (target - 1)
  const out: T[] = []
  for (let i = 0; i < target - 1; i++) out.push(points[Math.round(i * step)])
  out.push(points[points.length - 1])
  return out
}
