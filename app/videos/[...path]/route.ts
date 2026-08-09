import { serveMedia } from '@/lib/media'

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return serveMedia(req, 'videos', path)
}
