import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { load as yamlLoad } from 'js-yaml'
import { Trip } from '@/schema/trip'
import Editor from '@/components/edit/Editor'

/** DEV-ONLY authoring tool — see `app/edit/page.tsx`. */
export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { slug } = await params
  if (!/^[a-z0-9-]+$/.test(slug)) notFound()

  const file = path.join('stories', `${slug}.yaml`)
  if (!existsSync(file)) notFound()

  // Parsed, not raw: the editor works on the document, and a file that doesn't
  // validate should fail here rather than halfway through an editing session.
  const parsed = Trip.safeParse(yamlLoad(readFileSync(file, 'utf8')))
  if (!parsed.success) {
    return (
      <main className="min-h-screen bg-[#14181a] text-stone-200 font-mono text-sm p-10">
        <h1 className="text-red-400 text-base m-0">{file} does not validate</h1>
        <ul className="mt-4 text-stone-400">
          {parsed.error.issues.slice(0, 20).map((i, n) => (
            <li key={n}>{i.path.join('.') || '(root)'}: {i.message}</li>
          ))}
        </ul>
      </main>
    )
  }

  return <Editor initial={parsed.data} slug={slug} />
}
