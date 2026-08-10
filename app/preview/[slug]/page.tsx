import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { load as yamlLoad } from 'js-yaml'
import { Trip } from '@/schema/trip'
import LivePreview from '@/components/edit/LivePreview'

/**
 * The editor's live preview target. **Dev only** — it exists to be framed by
 * `/edit/<slug>` and is not a reading surface; `/stories/<slug>` is.
 *
 * It renders the file as a starting point and then takes the edited document
 * over postMessage, so the frame never reloads while you type.
 */
export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { slug } = await params
  if (!/^[a-z0-9-]+$/.test(slug)) notFound()

  const file = path.join('stories', `${slug}.yaml`)
  if (!existsSync(file)) notFound()

  const parsed = Trip.safeParse(yamlLoad(readFileSync(file, 'utf8')))
  if (!parsed.success) notFound()

  return <LivePreview initial={parsed.data} />
}
