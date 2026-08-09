import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllTrips } from '@/lib/trips'

/**
 * Index for the camera picker — a DEV-ONLY authoring tool.
 *
 * Not part of the reading experience and never shipped: a production build
 * 404s. It needs no bindings and no media, only the baked route, so plain
 * `npm run dev` is enough.
 */
export default function CameraIndex() {
  if (process.env.NODE_ENV === 'production') notFound()

  const trips = getAllTrips().filter((t) => t.trip.stage?.type === 'map')

  return (
    <main className="min-h-screen bg-[#14181a] text-stone-200 font-mono text-sm p-10">
      <h1 className="text-stone-500 text-[11px] uppercase tracking-wider m-0">Camera picker</h1>
      <p className="mt-2 mb-8 text-stone-400 max-w-xl leading-relaxed">
        Fly the map to a framing and copy the keyframe, instead of guessing four numbers and
        reloading. Map-stage stories only.
      </p>
      <ul className="m-0 p-0 list-none flex flex-col gap-2">
        {trips.map(({ trip }) => {
          const moves = trip.chapters.filter((c) => c.type === 'move').length
          return (
            <li key={trip.slug}>
              <Link
                href={`/camera/${trip.slug}`}
                className="flex justify-between gap-6 px-3 py-2 rounded border border-white/10 hover:bg-white/5 no-underline text-stone-200"
              >
                <span>{trip.slug}</span>
                <span className="text-stone-500">{moves} move{moves === 1 ? '' : 's'}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
