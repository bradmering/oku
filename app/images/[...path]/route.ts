import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Serve story media from R2.
 *
 * The trip documents keep their existing `/images/...` paths — the document
 * stays portable and storage-agnostic, and moving buckets is a config change
 * rather than a rewrite of every story. R2 → Worker transfer is free, so this
 * costs nothing beyond the request.
 */

const TYPES: Record<string, string> = {
  webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v',
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const key = `images/${path.join('/')}`

  const { env } = getCloudflareContext()
  const bucket = (env as { MEDIA?: R2Bucket }).MEDIA
  if (!bucket) return new Response('Media bucket not bound', { status: 500 })

  const obj = await bucket.get(key)
  if (!obj) return new Response('Not found', { status: 404 })

  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return new Response(obj.body, {
    headers: {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      // Media is immutable: a changed photo gets a new filename.
      'cache-control': 'public, max-age=31536000, immutable',
      etag: obj.httpEtag,
    },
  })
}
