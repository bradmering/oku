import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { dump as yamlDump } from 'js-yaml'
import { Trip } from '@/schema/trip'
import { resolveMedia } from '@/lib/resolve-media'

/**
 * Write an edited story back to its YAML file. **Dev only.**
 *
 * The editor is a local authoring tool (decisions/0021) — there is no auth, so
 * this must never exist in production, and a production build 404s.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const { slug } = await ctx.params
  // The slug becomes a filename, so it must not be able to climb out of
  // stories/ — this writes to disk on someone's laptop.
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return Response.json({ error: 'bad slug' }, { status: 400 })
  }

  const file = path.join('stories', `${slug}.yaml`)
  if (!existsSync(file)) return Response.json({ error: `${file} not found` }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'invalid JSON' }, { status: 400 })

  // Validate before writing. An editor that can save a document the renderer
  // then refuses is worse than one that won't save.
  const parsed = Trip.safeParse(body)
  if (!parsed.success) {
    return Response.json({
      error: 'does not validate',
      issues: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    }, { status: 422 })
  }

  // Cross-referential checks Zod can't do — a dangling mediaId would fail the
  // bake later, which is a much worse place to find out.
  const { issues } = resolveMedia(parsed.data)
  if (issues.length) {
    return Response.json({
      error: 'unresolved media references',
      issues: issues.slice(0, 10).map((i) => `${i.path}: ${i.message}`),
    }, { status: 422 })
  }

  // Keep the leading comment block: it explains that re-running ingest is safe,
  // which is exactly the thing a future reader of this file needs to know.
  const existing = readFileSync(file, 'utf8')
  const header = existing.startsWith('#')
    ? existing.slice(0, existing.indexOf('\n\n') + 2)
    : ''

  writeFileSync(file, header + yamlDump(parsed.data, { lineWidth: 100, noRefs: true }))
  return Response.json({ ok: true, file, chapters: parsed.data.chapters.length })
}
