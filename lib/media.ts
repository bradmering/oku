import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Serve story media out of R2.
 *
 * Documents keep their original paths (`/images/...`, `/videos/...`) and the
 * R2 key mirrors them exactly, so the documents never learn where the bytes
 * live and moving buckets is a config change.
 */

const TYPES: Record<string, string> = {
  webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', avif: 'image/avif',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm',
  mp3: 'audio/mpeg', m4a: 'audio/mp4',
}

/**
 * Dev-only: read a media key off the local disk.
 *
 * Searches the same roots as `scripts/upload-media.ts`, so whatever
 * `MEDIA_SOURCE` resolves for upload also resolves here and the two can't
 * disagree about where the bytes are.
 *
 * The imports are dynamic because `node:fs` must not end up in the Worker
 * bundle — this file is imported by a route that also runs in production.
 */
async function serveFromDisk(key: string, type: string): Promise<Response | null> {
  try {
    const { existsSync, readFileSync } = await import('node:fs')
    const { default: path } = await import('node:path')
    const roots = (process.env.MEDIA_SOURCE ?? '.media').split(':').filter(Boolean)
    for (const root of roots) {
      const file = path.join(root, key)
      if (!existsSync(file)) continue
      const bytes = readFileSync(file)
      return new Response(new Uint8Array(bytes), {
        headers: {
          'content-type': type,
          'content-length': String(bytes.length),
          // Deliberately NOT immutable: in dev you re-convert and expect to see it.
          'cache-control': 'no-store',
          'x-media-source': 'local-disk',
        },
      })
    }
  } catch {
    // Any filesystem trouble just falls through to the normal error path.
  }
  return null
}

export async function serveMedia(req: Request, prefix: string, path: string[]) {
  const key = `${prefix}/${path.join('/')}`

  // In `next dev` this THROWS rather than returning an empty env — the adapter
  // wants `initOpenNextCloudflareForDev()` in the Next config. That throw is why
  // media has always failed in dev: the 500 came from here, before any fallback
  // could run. Treat "no context" the same as "no binding".
  let bucket: R2Bucket | undefined
  try {
    bucket = (getCloudflareContext().env as { MEDIA?: R2Bucket }).MEDIA
  } catch {
    bucket = undefined
  }

  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  const type = TYPES[ext] ?? 'application/octet-stream'

  if (!bucket) {
    // `next dev` has no bindings, so every photo 404'd and the dev server was
    // useless for story work — which is fatal for an editor whose whole job is
    // showing you your photographs. Fall back to the local conversion output.
    // Dev only: a production build has the binding, and this branch is dead.
    if (process.env.NODE_ENV !== 'production') {
      const local = await serveFromDisk(key, type)
      if (local) return local
    }
    return new Response('Media bucket not bound', { status: 500 })
  }

  // Range support matters for video: without it, seeking re-downloads the file
  // and Safari won't scrub at all.
  const range = req.headers.get('range')
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    if (m) {
      const offset = m[1] ? Number(m[1]) : undefined
      const end = m[2] ? Number(m[2]) : undefined
      const obj = await bucket.get(key, {
        range: offset !== undefined
          ? { offset, length: end !== undefined ? end - offset + 1 : undefined }
          : { suffix: Number(m[2]) },
      })
      if (!obj) return new Response('Not found', { status: 404 })
      const total = obj.size
      const start = offset ?? total - Number(m[2])
      const last = end ?? total - 1
      return new Response(obj.body, {
        status: 206,
        headers: {
          'content-type': type,
          'content-range': `bytes ${start}-${last}/${total}`,
          'accept-ranges': 'bytes',
          'cache-control': 'public, max-age=31536000, immutable',
        },
      })
    }
  }

  const obj = await bucket.get(key)
  if (!obj) return new Response('Not found', { status: 404 })

  return new Response(obj.body, {
    headers: {
      'content-type': type,
      'accept-ranges': 'bytes',
      'content-length': String(obj.size),
      // Media is immutable — a changed photo gets a new filename.
      'cache-control': 'public, max-age=31536000, immutable',
      etag: obj.httpEtag,
    },
  })
}
