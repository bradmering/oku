import { notFound } from 'next/navigation'
import CameraPicker, { type MoveSummary } from '@/components/camera/CameraPicker'
import { getTrip } from '@/lib/trips'

/** DEV-ONLY authoring tool — see `app/camera/page.tsx`. */
export default async function CameraPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { slug } = await params
  const trip = getTrip(slug)
  if (!trip) notFound()

  const stage = trip.stage?.type === 'map' ? trip.stage : null
  if (!stage) notFound()

  const moves: MoveSummary[] = trip.chapters
    .map((c, index) => ({ c, index }))
    .filter((x): x is { c: Extract<typeof x.c, { type: 'move' }>; index: number } => x.c.type === 'move')
    .map(({ c, index }) => ({ id: c.id, index, to: c.to }))

  return (
    <CameraPicker
      slug={slug}
      styleUrl={stage.style}
      route={stage.route as [number, number][] | undefined}
      terrain={stage.terrain}
      moves={moves}
      initial={stage.initialView}
    />
  )
}
