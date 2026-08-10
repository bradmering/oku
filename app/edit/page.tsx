import Link from 'next/link'
import { existsSync, readdirSync } from 'node:fs'
import { notFound } from 'next/navigation'

/**
 * Index for the story editor — a DEV-ONLY authoring tool (decisions/0021).
 *
 * It reads and writes YAML on the local disk and has no auth, so a production
 * build 404s. It lists `stories/` rather than the baked trips, because it edits
 * source documents, not fixtures.
 */
export default function EditIndex() {
  if (process.env.NODE_ENV === 'production') notFound()

  const files = existsSync('stories')
    ? readdirSync('stories').filter((f) => /\.ya?ml$/.test(f))
    : []

  return (
    <main className="min-h-screen bg-[#14181a] text-stone-200 font-mono text-sm p-10">
      <h1 className="text-[11px] uppercase tracking-wider text-stone-500 m-0">Story editor</h1>
      <p className="mt-2 mb-8 text-stone-400 max-w-xl leading-relaxed">
        Cut the photographs you don&apos;t want, caption the ones you do, and write the prose.
        Saving writes the YAML; re-running ingest afterwards will not undo it.
      </p>
      {files.length === 0 && <p className="text-stone-600">No documents in stories/.</p>}
      <ul className="m-0 p-0 list-none flex flex-col gap-2">
        {files.map((f) => {
          const slug = f.replace(/\.ya?ml$/, '')
          return (
            <li key={slug}>
              <Link href={`/edit/${slug}`}
                className="block px-3 py-2 rounded border border-white/10 hover:bg-white/5 no-underline text-stone-200">
                {slug}
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
