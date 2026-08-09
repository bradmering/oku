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

export async function serveMedia(req: Request, prefix: string, path: string[]) {
  const key = `${prefix}/${path.join('/')}`
  const { env } = getCloudflareContext()
  const bucket = (env as { MEDIA?: R2Bucket }).MEDIA
  if (!bucket) return new Response('Media bucket not bound', { status: 500 })

  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  const type = TYPES[ext] ?? 'application/octet-stream'

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
